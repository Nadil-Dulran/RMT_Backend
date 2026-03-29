import * as settlementsService from '../services/settlementsService';

export const createSettlement = async (req: any, res: any) => {

  try {

    const userId = req.userId;

    const result = await settlementsService.createSettlement(
      userId,
      req.body
    );

    res.status(201).json(result);

  } catch (error: any) {

    res.status(400).json({ message: error.message });

  }

};

export const getSettlements = async (req: any, res: any) => {

  const { groupId } = req.query;

  const data = await settlementsService.getSettlementsByGroup(groupId);

  res.json(data);

};