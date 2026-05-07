import pool from '../config/db';

export const getProfile = async (userId: number) => {

  const [rows]: any = await pool.query(
    `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      s.currency,
      u.avatar_base64
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
  currency: string,
  avatarBase64?: string
) => {

  await pool.query(
    `
    UPDATE users
    SET name = ?, email = ?, phone = ?, avatar_base64 = ?
    WHERE id = ?
    `,
    [name, email, phone, avatarBase64 || null, userId]
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

export const deleteAccount = async (userId: number) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const [createdGroupRows]: any = await connection.query(
      `
      SELECT id
      FROM user_groups
      WHERE created_by = ?
      `,
      [userId]
    );

    const createdGroupIds = createdGroupRows
      .map((row: any) => Number(row.id))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    if (createdGroupIds.length > 0) {
      const groupPlaceholders = createdGroupIds.map(() => '?').join(', ');

      await connection.query(
        `
        DELETE es
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.group_id IN (${groupPlaceholders})
        `,
        createdGroupIds
      );

      await connection.query(
        `
        DELETE FROM expenses
        WHERE group_id IN (${groupPlaceholders})
        `,
        createdGroupIds
      );

      await connection.query(
        `
        DELETE FROM settlements
        WHERE group_id IN (${groupPlaceholders})
        `,
        createdGroupIds
      );

      await connection.query(
        `
        DELETE FROM group_members
        WHERE group_id IN (${groupPlaceholders})
        `,
        createdGroupIds
      );

      await connection.query(
        `
        DELETE FROM user_groups
        WHERE id IN (${groupPlaceholders})
        `,
        createdGroupIds
      );
    }

    await connection.query(
      `
      DELETE FROM expense_splits
      WHERE user_id = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM settlements
      WHERE payer_id = ? OR receiver_id = ?
      `,
      [userId, userId]
    );

    await connection.query(
      `
      DELETE FROM expenses
      WHERE created_by = ? OR paid_by = ?
      `,
      [userId, userId]
    );

    await connection.query(
      `
      DELETE FROM group_members
      WHERE user_id = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM notifications
      WHERE user_id = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM password_reset_codes
      WHERE user_id = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM user_profile_settings
      WHERE user_id = ?
      `,
      [userId]
    );

    await connection.query(
      `
      DELETE FROM users
      WHERE id = ?
      `,
      [userId]
    );

    await connection.commit();

  } catch (error) {

    await connection.rollback();
    throw error;

  } finally {

    connection.release();

  }

};
