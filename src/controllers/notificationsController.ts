import { addClient, removeClient } from '../utils/sseManager';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  purgeReadNotifications
} from '../services/notificationsService';

const parsePositiveInt = (value: unknown): number | null => {

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;

};

const parseUnreadOnly = (value: unknown): boolean => {

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  if (value === false || value === 0) {
    return false;
  }

  return true;

};

export const listNotifications = async (req: any, res: any) => {

  try {

    const userId = req.userId;
    const unreadOnly = parseUnreadOnly(req.query.unreadOnly);

    const notifications = await getNotifications(userId, unreadOnly);

    res.json(notifications);

  } catch (error) {

    res.status(500).json({ message: 'Failed to fetch notifications' });

  }

};

export const readNotification = async (req: any, res: any) => {

  try {

    const userId = req.userId;
    const notificationId = parsePositiveInt(req.params.id);

    if (notificationId === null) {
      res.status(400).json({ message: 'Invalid notification id' });
      return;
    }

    const updated = await markNotificationAsRead(userId, notificationId);

    if (!updated) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification marked as read' });

  } catch (error) {

    res.status(500).json({ message: 'Failed to update notification' });

  }

};

export const readAllNotifications = async (req: any, res: any) => {

  try {

    const userId = req.userId;

    const affected = await markAllNotificationsAsRead(userId);

    res.json({ updated: affected });

  } catch (error) {

    res.status(500).json({ message: 'Failed to update notifications' });

  }

};

export const purgeReadNotificationsForUser = async (req: any, res: any) => {

  try {

    const userId = req.userId;
    const parsedDays = Number(req.query.olderThanDays);
    const olderThanDays = Number.isInteger(parsedDays) && parsedDays > 0
      ? parsedDays
      : 2;

    const deleted = await purgeReadNotifications(userId, olderThanDays);

    res.json({ success: true, deleted });

  } catch (error) {

    res.status(500).json({ success: false, message: 'Failed to purge read notifications' });

  }

};

export const subscribe = (req: any, res: any) => {

  const userId = req.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  addClient(userId, res);

  req.on('close', () => {
    removeClient(userId, res);
  });

};