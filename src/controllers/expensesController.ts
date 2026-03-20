import { Request, Response } from 'express';
import * as expensesService from '../services/expensesService';

const parsePositiveInt = (value: unknown): number | null => {

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;

};

export const createExpense = async (req: any, res: any) => {

  try {

    const userId = req.userId;

    const result = await expensesService.createExpense(userId, req.body);

    res.status(201).json(result);

  } catch (error: any) {

    res.status(400).json({ message: error.message });

  }

};


export const getExpenses = async (req: any, res: Response) => {

  try {

    const groupId = parsePositiveInt(req.query.groupId);

    if (groupId === null) {
      res.status(400).json({ message: 'Invalid groupId query parameter' });
      return;
    }

    const expenses = await expensesService.getExpenses(groupId);

    res.json(expenses);

  } catch (error) {

    res.status(500).json({ message: 'Failed to fetch expenses' });

  }

};


export const updateExpense = async (req: Request, res: Response) => {

  try {

    const expenseId = parsePositiveInt(req.params.id);

    if (expenseId === null) {
      res.status(400).json({ message: 'Invalid expense id' });
      return;
    }

    await expensesService.updateExpense(expenseId, req.body);

    res.json({ message: 'Expense updated successfully' });

  } catch (error) {

    res.status(500).json({ message: 'Update failed' });

  }

};


export const deleteExpense = async (req: Request, res: Response) => {

  try {

    const expenseId = parsePositiveInt(req.params.id);

    if (expenseId === null) {
      res.status(400).json({ message: 'Invalid expense id' });
      return;
    }

    await expensesService.deleteExpense(expenseId);

    res.json({ message: 'Expense deleted successfully' });

  } catch (error) {

    res.status(500).json({ message: 'Delete failed' });

  }

};