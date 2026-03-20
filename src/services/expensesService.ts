import pool from '../config/db';

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

export const updateExpense = async (expenseId: number, data: any) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const {
      description,
      amount,
      category,
      date,
      splits
    } = data;

    // 1. Update main expense
    await connection.query(
      `
      UPDATE expenses
      SET title = ?, amount = ?, category = ?, expense_date = ?
      WHERE id = ?
      `,
      [description, amount, category, date, expenseId]
    );

    // 2. Delete old splits
    await connection.query(
      `
      DELETE FROM expense_splits
      WHERE expense_id = ?
      `,
      [expenseId]
    );

    // 3. Insert new splits
    for (const split of splits) {

      await connection.query(
        `
        INSERT INTO expense_splits
        (expense_id, user_id, share_amount)
        VALUES (?, ?, ?)
        `,
        [expenseId, split.userId, split.amount]
      );
    }

    await connection.commit();

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