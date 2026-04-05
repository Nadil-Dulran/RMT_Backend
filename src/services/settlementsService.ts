import pool from '../config/db';

export const createSettlement = async (userId: number, data: any) => {

  const { groupId, payerId, receiverId, amount, method, notes } = data;

  if (!groupId || !payerId || !receiverId || !amount) {
    throw new Error('Missing fields');
  }

  const payer = Number(payerId);
  const receiver = Number(receiverId);

  if (!Number.isInteger(payer) || !Number.isInteger(receiver) || payer === receiver) {
    throw new Error('Invalid payer/receiver');
  }

  if (userId !== payer && userId !== receiver) {
    throw new Error('You are not part of this settlement');
  }

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const [members]: any = await pool.query(
    `
    SELECT user_id FROM group_members
    WHERE group_id = ? AND user_id IN (?, ?)
    `,
    [groupId, payer, receiver]
  );

  if (members.length < 2) {
    throw new Error('Users not in same group');
  }

  const [result]: any = await pool.query(
    `
    INSERT INTO settlements
    (group_id, payer_id, receiver_id, amount, method, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [groupId, payer, receiver, amount, method || 'CASH', notes || null]
  );

  return { id: result.insertId };
};

export const getSettlementsByGroup = async (groupId: number) => {

  const [rows]: any = await pool.query(
    `
    SELECT 
      s.*,
      p.name AS payer_name,
      r.name AS receiver_name
    FROM settlements s
    JOIN users p ON s.payer_id = p.id
    JOIN users r ON s.receiver_id = r.id
    WHERE s.group_id = ? AND s.is_deleted = FALSE
    ORDER BY s.created_at DESC
    `,
    [groupId]
  );

  return rows;
};