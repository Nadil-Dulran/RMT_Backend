import pool from '../config/db';

export const createExpense = async (userId: number, data: any) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const {
      groupId,
      description,
      amount,
      category,
      date,
      splits
    } = data;

    // 1. Insert expense
    const [result]: any = await connection.query(
      `
      INSERT INTO expenses
      (group_id, created_by, title, amount, category, expense_date)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [groupId, userId, description, amount, category, date]
    );

    const expenseId = result.insertId;

    // 2. Insert splits
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

  const [rows]: any = await pool.query(
    `
    SELECT * FROM expenses
    WHERE group_id = ?
    ORDER BY expense_date DESC
    `,
    [groupId]
  );

  return rows;

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