import { Request, Response } from 'express';
import * as profileService from '../services/profileService';

export const getProfile = async (req: any, res: Response) => {
  try {

    const userId = req.userId;

    const profile = await profileService.getProfile(userId);

    res.json(profile);

  } catch (error) {

    res.status(500).json({ message: 'Failed to fetch profile' });

  }
};

export const updateProfile = async (req: any, res: Response) => {

  try {

    const userId = req.userId;

    const { name, email, phone, currency, avatarBase64 } = req.body;

    await profileService.updateProfile(
      userId,
      name,
      email,
      phone,
      currency,
      avatarBase64
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {

    res.status(500).json({ message: 'Profile update failed' });

  }

};

export const deleteAccount = async (req: any, res: Response) => {

  try {

    const userId = Number(req.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user' });
    }

    await profileService.deleteAccount(userId);

    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {

    return res.status(500).json({ message: 'Account deletion failed' });

  }

};
