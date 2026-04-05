import * as dashboardService from '../services/dashboardService';

export const getDashboard = async (req: any, res: any) => {

  try {

    const userId = req.userId;

    const data = await dashboardService.getDashboard(userId);

    res.json({
      success: true,
      data
    });

  } catch (error) {

    res.status(500).json({ success: false, message: 'Dashboard failed' });

  }

};