import pool from '../config/db';

export const getDashboard = async (userId: number) => {

  // 🔹 1. USER PROFILE
  const [[user]]: any = await pool.query(
    `
    SELECT 
      u.id,
      u.name,
      u.avatar_base64,
      s.currency
    FROM users u
    LEFT JOIN user_profile_settings s ON u.id = s.user_id
    WHERE u.id = ?
    `,
    [userId]
  );

  // 🔹 2. GROUPS
  const [groups]: any = await pool.query(
    `
    SELECT g.id, g.name, g.emoji
    FROM user_groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
    `,
    [userId]
  );

  // 🔹 3. EXPENSES + SPLITS
  const [rows]: any = await pool.query(
    `
    SELECT 
      e.id,
      e.group_id,
      e.paid_by,
      e.amount,
      e.category,
      e.title,
      e.expense_date,
      e.created_at,
      es.user_id,
      es.share_amount,
      u.name AS paidByName
    FROM expenses e
    JOIN expense_splits es ON e.id = es.expense_id
    JOIN users u ON e.paid_by = u.id
    WHERE e.group_id IN (
      SELECT group_id FROM group_members WHERE user_id = ?
    )
    `,
    [userId]
  );

  // 🔹 4. Group expenses by expense_id
  const expenseMap: any = {};

  rows.forEach((row: any) => {

    if (!expenseMap[row.id]) {
      expenseMap[row.id] = {
        id: row.id,
        groupId: row.group_id,
        paidBy: {
          id: row.paid_by,
          name: row.paidByName
        },
        amount: Number(row.amount),
        category: row.category,
        description: row.title,
        date: row.expense_date || row.created_at,
        splits: []
      };
    }

    expenseMap[row.id].splits.push({
      userId: row.user_id,
      amount: Number(row.share_amount)
    });

  });

  const expenses = Object.values(expenseMap);

  // 🔥 5. SUMMARY CALCULATION (MATCH FRONTEND)
  let totalOwed = 0;
  let totalOwing = 0;

  expenses.forEach((exp: any) => {

    if (exp.paidBy.id === userId) {

      exp.splits.forEach((s: any) => {
        if (s.userId !== userId) {
          totalOwed += s.amount;
        }
      });

    } else {

      const mySplit = exp.splits.find((s: any) => s.userId === userId);

      if (mySplit) {
        totalOwing += mySplit.amount;
      }

    }

  });

  const totalBalance = totalOwed - totalOwing;

  // 🔥 6. GROUP BALANCES
  const groupBalances = groups.map((group: any) => {

    let balance = 0;

    const groupExpenses = expenses.filter(
      (e: any) => e.groupId === group.id
    );

    groupExpenses.forEach((exp: any) => {

      if (exp.paidBy.id === userId) {

        exp.splits.forEach((s: any) => {
          if (s.userId !== userId) {
            balance += s.amount;
          }
        });

      } else {

        const mySplit = exp.splits.find((s: any) => s.userId === userId);

        if (mySplit) {
          balance -= mySplit.amount;
        }

      }

    });

    return {
      id: group.id,
      name: group.name,
      emoji: group.emoji,
      membersCount: 0, // optional later
      balance: {
        amount: Math.abs(balance),
        isYouOwing: balance < 0
      }
    };

  });

  // 🔥 7. RECENT EXPENSES
  const recentExpenses = expenses
    .sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, 2);

  return {
    user: {
      id: user.id,
      name: user.name,
      avatarBase64: user.avatar_base64,
      currency: user.currency || 'USD'
    },
    summary: {
      totalOwed,
      totalOwing,
      totalBalance
    },
    groups: groupBalances,
    recentExpenses
  };

};