import pool from '../config/db';

export const getProfile = async (userId: number) => {

  const [rows]: any = await pool.query(
    `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      s.currency
    FROM users u
    LEFT JOIN user_profile_settings s
      ON u.id = s.user_id
    WHERE u.id = ?
    `,
    [userId]
  );

  return rows[0];
};


export const updateProfile = async (
  userId: number,
  name: string,
  email: string,
  phone: string,
  currency: string
) => {

  await pool.query(
    `
    UPDATE users
    SET name = ?, email = ?, phone = ?
    WHERE id = ?
    `,
    [name, email, phone, userId]
  );

  await pool.query(
    `
    INSERT INTO user_profile_settings (user_id, currency)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE currency = ?
    `,
    [userId, currency, currency]
  );

};
