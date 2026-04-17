import pool from '../config/db';
import { notifyUsers } from './notificationsService';

export const createSettlement = async (userId: number, data: any) => {

  const { groupId, payerId, receiverId, amount, method, notes, description, expenseId } = data;

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
    [groupId, payer, receiver, amount, method || 'CASH', notes || description || null]
  );

  const [users]: any = await pool.query(
    `
    SELECT id, name
    FROM users
    WHERE id IN (?, ?)
    `,
    [payer, receiver]
  );

  const payerRow = users.find((row: any) => Number(row.id) === payer);
  const receiverRow = users.find((row: any) => Number(row.id) === receiver);

  const settlementDescription = typeof description === 'string' && description.trim().length > 0
    ? description.trim()
    : typeof notes === 'string' && notes.trim().length > 0
      ? notes.trim()
      : null;

  const normalizedExpenseId = Number(expenseId);
  const settlementPayload = {
    settlementId: result.insertId,
    description: settlementDescription,
    notes: typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null,
    payerName: payerRow?.name ?? null,
    receiverName: receiverRow?.name ?? null,
    method: method || 'CASH',
    expenseId: Number.isInteger(normalizedExpenseId) && normalizedExpenseId > 0 ? normalizedExpenseId : null,
    groupId: Number(groupId),
    payerId: payer,
    receiverId: receiver,
    amount: Number(amount)
  };

  await notifyUsers(
    [payer, receiver],
    'expense_settled',
    'Expense settled',
    settlementPayload.description
      ? `${settlementPayload.description} settled by ${settlementPayload.payerName ?? 'payer'} to ${settlementPayload.receiverName ?? 'receiver'}`
      : `Settlement of ${amount} was recorded`,
    settlementPayload,
    [userId],
    userId
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