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
