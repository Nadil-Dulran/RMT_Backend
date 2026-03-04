import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db';

export const register = async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const [existing]: any = await pool.query(
  'SELECT id FROM users WHERE email = ?',
  [email]
  );

  if (existing.length > 0) {
   return res.status(400).json({ message: 'Email already exists' });
  }

  await pool.query(
    'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
    [name, email, phone || null, hashedPassword]
  );

  res.status(201).json({ message: 'User created successfully' });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const [rows]: any = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );

  if (rows.length === 0) {
    return res.status(400).json({ message: 'User not found' });
  }

  const user = rows[0];

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET as string,
    { expiresIn: '1d' }
  );

  res.json({
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
  },
  });  
};
