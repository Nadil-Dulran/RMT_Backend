import pool from '../config/db';
import { sendNotification } from '../utils/sseManager';

export const createNotification = async (
  userId: number,
  type: string,
  title: string,
  message: string,
  data: any = {}
) => {

  const [result]: any = await pool.query(
    `
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (?, ?, ?, ?, ?)
    `,
    [userId, type, title, message, JSON.stringify(data)]
  );

  const notification = {
    id: result.insertId,
    type,
    title,
    message,
    data,
    is_read: false
  };

  // 🔥 SEND REAL-TIME EVENT
  sendNotification(userId, notification);

};