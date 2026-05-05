import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../config/db';

const RESET_CODE_TTL_MINUTES = 10;
const RESET_TOKEN_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;

const requestBucketsByEmail = new Map<string, number[]>();
const requestBucketsByIp = new Map<string, number[]>();

type ResetSessionRow = {
  id: number;
  user_id: number;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  max_attempts: number;
  is_verified: 0 | 1 | boolean;
  verified_at: string | null;
  reset_token_hash: string | null;
  reset_token_expires_at: string | null;
  used_at: string | null;
  created_at: string;
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashValue = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

const generateResetCode = () =>
  crypto.randomInt(0, 1000000).toString().padStart(6, '0');

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const isRateLimited = (key: string, bucketMap: Map<string, number[]>) => {
  const now = Date.now();
  const existing = bucketMap.get(key) ?? [];
  const recent = existing.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    bucketMap.set(key, recent);
    return true;
  }

  recent.push(now);
  bucketMap.set(key, recent);
  return false;
};

const toSqlTimestamp = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

const sendResetEmail = async (email: string, code: string) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPassword || !emailFrom) {
    console.log(`Password reset code for ${email}: ${code}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  await transporter.sendMail({
    from: emailFrom,
    to: email,
    subject: 'Your password reset code',
    text: `Your reset code is ${code}. It expires in ${RESET_CODE_TTL_MINUTES} minutes.`,
  });
};

export const register = async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const [existing]: any = await pool.query(
  'SELECT id FROM users WHERE email = ?',
  [email]
  );

  if (existing.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Email already exists',
    });
  }

  await pool.query(
    'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
    [name, email, phone || null, hashedPassword]
  );

  res.status(201).json({
  success: true,
  message: 'User created successfully',
});
};

export const requestPasswordResetCode = async (req: Request, res: Response) => {
  const email = normalizeEmail(String(req.body?.email || ''));
  const clientIp = getClientIp(req);

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      message: 'Please provide a valid email address',
    });
  }

  if (
    isRateLimited(`email:${email}`, requestBucketsByEmail)
    || isRateLimited(`ip:${clientIp}`, requestBucketsByIp)
  ) {
    return res.status(429).json({
      message: 'Too many reset requests. Please try again later.',
    });
  }

  const [users]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

  if (users.length === 0) {
    return res.status(404).json({
      message: 'Email not found',
    });
  }

  await pool.query(
    'UPDATE password_reset_codes SET used_at = NOW() WHERE email = ? AND used_at IS NULL',
    [email]
  );

  const code = generateResetCode();
  const codeHash = hashValue(code);

  // Set expires_at using MySQL DATE_ADD(NOW(), INTERVAL ... MINUTE) to avoid timezone
  // conversion issues between the app and the DB server.
  await pool.query(
    `INSERT INTO password_reset_codes (
      user_id,
      email,
      code_hash,
      expires_at,
      attempts,
      max_attempts,
      is_verified,
      verified_at,
      reset_token_hash,
      reset_token_expires_at,
      used_at,
      created_at
    ) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0, ?, FALSE, NULL, NULL, NULL, NULL, NOW())`,
    [users[0].id, email, codeHash, RESET_CODE_TTL_MINUTES, MAX_VERIFY_ATTEMPTS]
  );

  await sendResetEmail(email, code);

  return res.json({
    message: 'Reset code sent to email',
  });
};

export const verifyPasswordResetCode = async (req: Request, res: Response) => {
  const email = normalizeEmail(String(req.body?.email || ''));
  const code = String(req.body?.code || '').trim();

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      message: 'Please provide a valid email address',
    });
  }

  if (!/^[0-9]{6}$/.test(code)) {
    return res.status(400).json({
      message: 'Please provide a valid 6-digit code',
    });
  }

  const [rows]: any = await pool.query(
    `SELECT *
     FROM password_reset_codes
     WHERE email = ? AND used_at IS NULL
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [email]
  );

  if (rows.length === 0) {
    return res.status(400).json({
      message: 'Invalid or expired reset code',
    });
  }

  const resetRow = rows[0] as ResetSessionRow;
  const now = new Date();
  const expiresAt = new Date(resetRow.expires_at);

  if (now > expiresAt || resetRow.attempts >= resetRow.max_attempts) {
    await pool.query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [resetRow.id]);
    return res.status(400).json({
      message: 'Invalid or expired reset code',
    });
  }

  const expectedHash = Buffer.from(resetRow.code_hash, 'hex');
  const actualHash = Buffer.from(hashValue(code), 'hex');

  const hashesMatch =
    expectedHash.length === actualHash.length &&
    crypto.timingSafeEqual(expectedHash, actualHash);

  if (!hashesMatch) {
    const nextAttempts = resetRow.attempts + 1;

    await pool.query(
      'UPDATE password_reset_codes SET attempts = ?, used_at = CASE WHEN ? >= max_attempts THEN NOW() ELSE used_at END WHERE id = ?',
      [nextAttempts, nextAttempts, resetRow.id]
    );

    return res.status(400).json({
      message: 'Invalid or expired reset code',
    });
  }

  const resetToken = generateResetToken();
  const resetTokenHash = hashValue(resetToken);
  const resetTokenExpiresAt = toSqlTimestamp(new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000));

  await pool.query(
    `UPDATE password_reset_codes
     SET is_verified = TRUE,
         verified_at = NOW(),
         reset_token_hash = ?,
         reset_token_expires_at = ?,
         attempts = attempts + 1
     WHERE id = ?`,
    [resetTokenHash, resetTokenExpiresAt, resetRow.id]
  );

  return res.json({
    message: 'Code verified',
    resetToken,
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  const email = normalizeEmail(String(req.body?.email || ''));
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({
      message: 'Please provide a valid email address',
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      message: 'Passwords do not match',
    });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number',
    });
  }

  const [rows]: any = await pool.query(
    `SELECT *
     FROM password_reset_codes
     WHERE email = ? AND used_at IS NULL AND is_verified = TRUE
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [email]
  );

  if (rows.length === 0) {
    return res.status(400).json({
      message: 'Invalid or expired reset session',
    });
  }

  const resetRow = rows[0] as ResetSessionRow;
  const now = new Date();

  if (now > new Date(resetRow.expires_at)) {
    await pool.query('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?', [resetRow.id]);
    return res.status(400).json({
      message: 'Invalid or expired reset session',
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, resetRow.user_id]);
  await pool.query(
    `UPDATE password_reset_codes
     SET used_at = NOW(),
         reset_token_hash = NULL,
         reset_token_expires_at = NULL
     WHERE id = ?`,
    [resetRow.id]
  );

  return res.json({
    message: 'Password updated successfully',
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const [rows]: any = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'User not found'
    });
  }

  const user = rows[0];

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET as string,
    { expiresIn: '5d' }
  );

  res.json({
    success: true,
    token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  },
  });  
};
