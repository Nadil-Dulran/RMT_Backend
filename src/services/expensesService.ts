import pool from '../config/db';
import { notifyGroupMembers } from './notificationsService';

const normalizeExpenseDate = (value: any): string => {
  if (!value) {
    throw new Error('Invalid expense date');
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match && match[1]) {
      return match[1];
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid expense date format');
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const createExpense = async (userId: number, data: any) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const {
      description,
      amount,
      category,
      groupId,
      paidById,
      date,
      splitType,
      splits
    } = data;

    // 🔴 1. Basic validation
    if (!description || !amount || !groupId || !paidById || !splitType) {
      throw new Error('Missing required fields');
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      throw new Error('Splits are required');
    }

    // 🔴 2. Insert expense
    const [result]: any = await connection.query(
      `
      INSERT INTO expenses
      (group_id, created_by, paid_by, title, amount, category, expense_date, split_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        groupId,
        userId,
        paidById,
        description,
        amount,
        category,
        date,
        splitType
      ]
    );

    const expenseId = result.insertId;

    // 🔥 3. Handle split logic
    let calculatedSplits: any[] = [];

    if (splitType === 'equal') {

      const splitAmount = amount / splits.length;

      calculatedSplits = splits.map((s: any) => ({
        userId: s.userId,
        amount: Number(splitAmount.toFixed(2)),
        percentage: null
      }));

    }

    else if (splitType === 'exact') {

      let total = 0;

      splits.forEach((s: any) => {
        total += Number(s.amount);
      });

      if (Math.abs(total - amount) > 0.01) {
        throw new Error('Split total does not match expense amount');
      }

      calculatedSplits = splits.map((s: any) => ({
        userId: s.userId,
        amount: Number(s.amount),
        percentage: null
      }));

    }

    else if (splitType === 'percentage') {

      let totalPercent = 0;

      calculatedSplits = splits.map((s: any) => {

        totalPercent += Number(s.percentage);

        const calculatedAmount = (amount * s.percentage) / 100;

        return {
          userId: s.userId,
          amount: Number(calculatedAmount.toFixed(2)),
          percentage: Number(s.percentage)
        };

      });

      if (Math.abs(totalPercent - 100) > 0.1) {
        throw new Error('Total percentage must be 100%');
      }

    }

    else {
      throw new Error('Invalid split type');
    }

    // 🔴 4. Insert splits
    for (const split of calculatedSplits) {

      await connection.query(
        `
        INSERT INTO expense_splits
        (expense_id, user_id, share_amount, percentage)
        VALUES (?, ?, ?, ?)
        `,
        [
          expenseId,
          split.userId,
          split.amount,
          split.percentage
        ]
      );

    }

    await connection.commit();

    await notifyGroupMembers(
      Number(groupId),
      'expense_created',
      'New expense added',
      `${description} was added to the group`,
      {
        expenseId,
        description,
        amount: Number(amount),
        paidById,
        splitType
      },
      [userId],
      userId
    );

    return { id: expenseId };

  } catch (error) {

    await connection.rollback();
    throw error;

  } finally {

    connection.release();

  }

};

export const getExpenses = async (groupId: number) => {

  if (!Number.isInteger(groupId) || groupId <= 0) {
    throw new Error('Invalid group id');
  }

  const [expenses]: any = await pool.query(
    `
    SELECT DISTINCT e.* FROM expenses e
    WHERE e.group_id = ?
    ORDER BY e.expense_date DESC
    `,
    [groupId]
  );

  // Fetch splits for each expense
  const expensesWithSplits = await Promise.all(
    expenses.map(async (expense: any) => {
      const [splits]: any = await pool.query(
        `
        SELECT id, user_id, share_amount, percentage FROM expense_splits
        WHERE expense_id = ?
        `,
        [expense.id]
      );

      return {
        ...expense,
        splits
      };
    })
  );

  return expensesWithSplits;

};

export const updateExpense = async (expenseId: number, data: any, actorUserId?: number) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const allowedKeys = [
      'description',
      'amount',
      'splitType',
      'splits',
      'category',
      'categoryEmoji',
      'expense_date',
      'date'
    ];

    const payloadKeys = Object.keys(data || {});
    const unsupportedKeys = payloadKeys.filter((key) => !allowedKeys.includes(key));

    if (unsupportedKeys.length > 0) {
      throw new Error(`Unsupported fields: ${unsupportedKeys.join(', ')}`);
    }

    const hasKey = (key: string) => Object.prototype.hasOwnProperty.call(data || {}, key);
    const hasDescription = hasKey('description');
    const hasAmount = hasKey('amount');
    const hasSplitType = hasKey('splitType');
    const hasSplits = hasKey('splits');
    const hasCategory = hasKey('category');
    const hasExpenseDate = hasKey('expense_date') || hasKey('date');

    if (!hasDescription && !hasAmount && !hasSplitType && !hasSplits && !hasCategory && !hasExpenseDate) {
      throw new Error('No updatable fields provided');
    }

    const [existingRows]: any = await connection.query(
      `
      SELECT id, group_id, title, amount, category, expense_date, split_type
      FROM expenses
      WHERE id = ?
      LIMIT 1
      `,
      [expenseId]
    );

    if (!existingRows.length) {
      throw new Error('Expense not found');
    }

    const existing = existingRows[0];
    const resolvedDescription = hasDescription ? data.description : existing.title;
    const resolvedAmount = hasAmount ? Number(data.amount) : Number(existing.amount);
    const resolvedSplitType = hasSplitType ? data.splitType : existing.split_type;
    const resolvedCategory = hasCategory ? data.category : existing.category;

    let resolvedExpenseDate = existing.expense_date;

    if (hasExpenseDate) {
      const incomingDate = hasKey('expense_date') ? data.expense_date : data.date;
      resolvedExpenseDate = normalizeExpenseDate(incomingDate);
    }

    if (typeof resolvedDescription !== 'string' || resolvedDescription.trim().length === 0) {
      throw new Error('Description is required');
    }

    if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!['equal', 'exact', 'percentage'].includes(resolvedSplitType)) {
      throw new Error('Invalid split type');
    }

    await connection.query(
      `
      UPDATE expenses
      SET title = ?, amount = ?, category = ?, expense_date = ?, split_type = ?
      WHERE id = ?
      `,
      [
        resolvedDescription,
        resolvedAmount,
        resolvedCategory,
        resolvedExpenseDate,
        resolvedSplitType,
        expenseId
      ]
    );

    if (hasAmount || hasSplitType) {
      if (!hasSplits) {
        throw new Error('Splits are required when amount or splitType is changed');
      }
    }

    if (hasSplits) {
      if (!Array.isArray(data.splits) || data.splits.length === 0) {
        throw new Error('Splits are required');
      }

      let calculatedSplits: any[] = [];

      if (resolvedSplitType === 'equal') {
        const splitAmount = resolvedAmount / data.splits.length;
        calculatedSplits = data.splits.map((s: any) => ({
          userId: s.userId,
          amount: Number(splitAmount.toFixed(2)),
          percentage: null
        }));
      } else if (resolvedSplitType === 'exact') {
        let total = 0;
        data.splits.forEach((s: any) => {
          total += Number(s.amount);
        });

        if (Math.abs(total - resolvedAmount) > 0.01) {
          throw new Error('Split total does not match expense amount');
        }

        calculatedSplits = data.splits.map((s: any) => ({
          userId: s.userId,
          amount: Number(s.amount),
          percentage: null
        }));
      } else {
        let totalPercent = 0;

        calculatedSplits = data.splits.map((s: any) => {
          totalPercent += Number(s.percentage);
          const calculatedAmount = (resolvedAmount * Number(s.percentage)) / 100;

          return {
            userId: s.userId,
            amount: Number(calculatedAmount.toFixed(2)),
            percentage: Number(s.percentage)
          };
        });

        if (Math.abs(totalPercent - 100) > 0.1) {
          throw new Error('Total percentage must be 100%');
        }
      }

      await connection.query(
        `
        DELETE FROM expense_splits
        WHERE expense_id = ?
        `,
        [expenseId]
      );

      for (const split of calculatedSplits) {
        if (!Number.isInteger(Number(split.userId))) {
          throw new Error('Invalid split userId');
        }

        if (!Number.isFinite(Number(split.amount)) || Number(split.amount) < 0) {
          throw new Error('Invalid split amount');
        }

        await connection.query(
          `
          INSERT INTO expense_splits
          (expense_id, user_id, share_amount, percentage)
          VALUES (?, ?, ?, ?)
          `,
          [expenseId, Number(split.userId), Number(split.amount), split.percentage]
        );
      }
    }

    await connection.commit();

    await notifyGroupMembers(
      Number(existing.group_id),
      'expense_updated',
      'Expense updated',
      `${resolvedDescription} was updated`,
      {
        expenseId,
        description: resolvedDescription,
        amount: resolvedAmount,
        splitType: resolvedSplitType
      },
      [],
      actorUserId
    );

  } catch (error) {

    await connection.rollback();
    throw error;

  } finally {

    connection.release();

  }

};

export const deleteExpense = async (expenseId: number) => {

  await pool.query(
    `
    DELETE FROM expenses
    WHERE id = ?
    `,
    [expenseId]
  );

};