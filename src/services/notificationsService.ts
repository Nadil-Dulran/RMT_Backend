import pool from '../config/db';
import { sendNotification } from '../utils/sseManager';

type RelatedUser = {
  id: number;
  name: string | null;
  avatar_base64: string | null;
};

type GroupSummary = {
  name: string;
  emoji: string | null;
};

type SerializedNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

const getRelatedUser = async (userId: number): Promise<RelatedUser | null> => {

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const [rows]: any = await pool.query(
    `
    SELECT id, name, avatar_base64
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (!rows.length) {
    return null;
  }

  return {
    id: Number(rows[0].id),
    name: rows[0].name ?? null,
    avatar_base64: rows[0].avatar_base64 ?? null
  };

};

const getGroupSummary = async (groupId: number): Promise<GroupSummary | null> => {

  if (!Number.isInteger(groupId) || groupId <= 0) {
    return null;
  }

  const [rows]: any = await pool.query(
    `
    SELECT name, emoji
    FROM user_groups
    WHERE id = ?
    LIMIT 1
    `,
    [groupId]
  );

  if (!rows.length) {
    return null;
  }

  return {
    name: rows[0].name,
    emoji: rows[0].emoji ?? null
  };

};

const enrichNotificationData = async (data: any, relatedUserId?: number) => {

  let payload: any = {};

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    payload = { ...data };
  }

  const normalizedRelatedUserId = Number(relatedUserId);
  const inferredRelatedUserId = Number(
    payload.relatedUser?.id
    ?? payload.related_user?.id
    ?? payload.relatedUserId
    ?? payload.related_user_id
    ?? payload.actorUserId
    ?? payload.actor_user_id
    ?? payload.createdById
    ?? payload.created_by_id
    ?? payload.paidById
    ?? payload.paid_by_id
    ?? payload.payerId
    ?? payload.payer_id
  );

  const resolvedRelatedUserId = Number.isInteger(normalizedRelatedUserId) && normalizedRelatedUserId > 0
    ? normalizedRelatedUserId
    : inferredRelatedUserId;

  if ((!payload.relatedUser || typeof payload.relatedUser !== 'object')
    && Number.isInteger(resolvedRelatedUserId)
    && resolvedRelatedUserId > 0) {
    const relatedUser = await getRelatedUser(resolvedRelatedUserId);

    if (relatedUser) {
      payload = {
        ...payload,
        relatedUser
      };
    }
  }

  const existingRelatedUser = payload.relatedUser && typeof payload.relatedUser === 'object'
    ? payload.relatedUser
    : {};

  payload.relatedUser = {
    id: Number(existingRelatedUser.id ?? null),
    name: existingRelatedUser.name ?? null,
    avatar_base64: existingRelatedUser.avatar_base64
      ?? existingRelatedUser.avatarBase64
      ?? null
  };

  if (!Number.isInteger(payload.relatedUser.id) || payload.relatedUser.id <= 0) {
    payload.relatedUser.id = null;
  }

  const groupIdCandidate = Number(payload.groupId ?? payload.group_id);
  const hasGroupName = typeof payload.groupName === 'string' && payload.groupName.length > 0;
  const hasGroupEmoji = Object.prototype.hasOwnProperty.call(payload, 'groupEmoji');

  if (!hasGroupName && typeof payload.name === 'string' && payload.name.length > 0) {
    payload.groupName = payload.name;
  }

  if (!hasGroupEmoji && Object.prototype.hasOwnProperty.call(payload, 'emoji')) {
    payload.groupEmoji = payload.emoji ?? null;
  }

  const shouldLookupGroup = Number.isInteger(groupIdCandidate)
    && groupIdCandidate > 0
    && (!payload.groupName || !Object.prototype.hasOwnProperty.call(payload, 'groupEmoji'));

  if (shouldLookupGroup) {
    const groupSummary = await getGroupSummary(groupIdCandidate);

    if (groupSummary) {
      payload = {
        ...payload,
        groupName: payload.groupName || groupSummary.name,
        groupEmoji: Object.prototype.hasOwnProperty.call(payload, 'groupEmoji')
          ? payload.groupEmoji
          : groupSummary.emoji
      };
    }
  }

  if (!payload.groupName) {
    payload.groupName = null;
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'groupEmoji')) {
    payload.groupEmoji = null;
  }

  return payload;

};

const parseDataValue = (value: any) => {

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }

};

const toIsoString = (value: any): string => {

  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();

};

const serializeNotification = async (input: {
  id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  read_at: any;
  created_at: any;
}): Promise<SerializedNotification> => {

  const enrichedData = await enrichNotificationData(parseDataValue(input.data));

  return {
    id: Number(input.id),
    type: input.type,
    title: input.title,
    message: input.message,
    data: enrichedData,
    is_read: Boolean(input.is_read),
    read_at: input.read_at ? toIsoString(input.read_at) : null,
    created_at: toIsoString(input.created_at)
  };

};

export const createNotification = async (
  userId: number,
  type: string,
  title: string,
  message: string,
  data: any = {}
) => {

  const [result]: any = await pool.query(
    `
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (?, ?, ?, ?, ?)
    `,
    [userId, type, title, message, JSON.stringify(data)]
  );

  const notification = await serializeNotification({
    id: result.insertId,
    type,
    title,
    message,
    data,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString()
  });

  // 🔥 SEND REAL-TIME EVENT
  sendNotification(userId, notification);

};

export const getNotifications = async (
  userId: number,
  unreadOnly: boolean = true
) => {

  const [rows]: any = await pool.query(
    `
    SELECT id, type, title, message, data, is_read, read_at, created_at
    FROM notifications
    WHERE user_id = ?
      AND (? = FALSE OR is_read = FALSE)
    ORDER BY created_at DESC
    `,
    [userId, unreadOnly]
  );

  return Promise.all(
    rows.map((row: any) => serializeNotification({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      is_read: row.is_read,
      read_at: row.read_at,
      created_at: row.created_at
    }))
  );

};

export const markNotificationAsRead = async (
  userId: number,
  notificationId: number
) => {

  const [result]: any = await pool.query(
    `
    UPDATE notifications
    SET is_read = TRUE,
        read_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND user_id = ?
      AND is_read = FALSE
    `,
    [notificationId, userId]
  );

  return result.affectedRows > 0;

};

export const markAllNotificationsAsRead = async (userId: number) => {

  const [result]: any = await pool.query(
    `
    UPDATE notifications
    SET is_read = TRUE,
        read_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
      AND is_read = FALSE
    `,
    [userId]
  );

  return result.affectedRows;

};

export const purgeReadNotifications = async (
  userId: number,
  olderThanDays: number = 2
) => {

  const retentionDays = Number.isInteger(olderThanDays) && olderThanDays > 0
    ? olderThanDays
    : 2;

  const [result]: any = await pool.query(
    `
    DELETE FROM notifications
    WHERE user_id = ?
      AND is_read = TRUE
      AND read_at IS NOT NULL
      AND read_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
    `,
    [userId, retentionDays]
  );

  return result.affectedRows;

};

export const purgeReadNotificationsForAllUsers = async (
  olderThanDays: number = 2
) => {

  const retentionDays = Number.isInteger(olderThanDays) && olderThanDays > 0
    ? olderThanDays
    : 2;

  const [result]: any = await pool.query(
    `
    DELETE FROM notifications
    WHERE is_read = TRUE
      AND read_at IS NOT NULL
      AND read_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
    `,
    [retentionDays]
  );

  return result.affectedRows;

};

export const getGroupMemberIds = async (groupId: number): Promise<number[]> => {

  const [rows]: any = await pool.query(
    `
    SELECT user_id
    FROM group_members
    WHERE group_id = ?
    `,
    [groupId]
  );

  return rows.map((row: any) => Number(row.user_id));

};

export const notifyUsers = async (
  userIds: number[],
  type: string,
  title: string,
  message: string,
  data: any = {},
  excludedUserIds: number[] = [],
  relatedUserId?: number
) => {

  const excluded = new Set(excludedUserIds.map((id) => Number(id)));
  const uniqueUserIds = [...new Set(userIds.map((id) => Number(id)))].filter(
    (id) => Number.isInteger(id) && id > 0 && !excluded.has(id)
  );

  const payload = await enrichNotificationData(data, relatedUserId);

  const results = await Promise.allSettled(
    uniqueUserIds.map((id) =>
      createNotification(id, type, title, message, payload)
    )
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('Failed to create notification for user', uniqueUserIds[index], result.reason);
    }
  });

};

export const notifyGroupMembers = async (
  groupId: number,
  type: string,
  title: string,
  message: string,
  data: any = {},
  excludedUserIds: number[] = [],
  relatedUserId?: number
) => {

  const memberIds = await getGroupMemberIds(groupId);

  await notifyUsers(
    memberIds,
    type,
    title,
    message,
    {
      ...data,
      groupId
    },
    excludedUserIds,
    relatedUserId
  );

};