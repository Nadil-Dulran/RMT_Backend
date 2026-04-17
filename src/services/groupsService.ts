import pool from '../config/db';
import { notifyGroupMembers, notifyUsers } from './notificationsService';

export const createGroup = async (
  userId: number,
  name: string,
  description: string,
  emoji?: string
) => {

  const [result]: any = await pool.query(
    `
    INSERT INTO user_groups (name, description, emoji, created_by)
    VALUES (?, ?, ?, ?)
    `,
    [name, description, emoji, userId]
  );

  const groupId = result.insertId;

  await pool.query(
    `
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (?, ?, 'admin')
    `,
    [groupId, userId]
  );

  await notifyUsers(
    [userId],
    'group_created',
    'Group created',
    `Group ${name} was created`,
    {
      groupId,
      name,
      description,
      emoji: emoji || null
    },
    [],
    userId
  );

  return {
    id: groupId,
    name,
    description,
    emoji
  };

};


export const getGroups = async (userId: number) => {

  const [rows]: any = await pool.query(
    `
    SELECT g.*
    FROM user_groups g
    JOIN group_members gm
      ON g.id = gm.group_id
    WHERE gm.user_id = ?
    `,
    [userId]
  );

  return rows;

};


export const getGroupById = async (groupId: number) => {

  const [rows]: any = await pool.query(
    `
    SELECT *
    FROM user_groups
    WHERE id = ?
    `,
    [groupId]
  );

  return rows[0];

};


export const updateGroup = async (
  groupId: number,
  name: string,
  description: string,
  emoji?: string,
  actorUserId?: number
) => {

  await pool.query(
    `
    UPDATE user_groups
    SET name = ?, description = ?, emoji = ?
    WHERE id = ?
    `,
    [name, description, emoji, groupId]
  );

  await notifyGroupMembers(
    groupId,
    'group_updated',
    'Group updated',
    `Group ${name} was updated`,
    {
      name,
      description,
      emoji: emoji || null
    },
    [],
    actorUserId
  );

};


export const deleteGroup = async (groupId: number, actorUserId?: number) => {

  const [groupRows]: any = await pool.query(
    `
    SELECT name
    FROM user_groups
    WHERE id = ?
    LIMIT 1
    `,
    [groupId]
  );

  const groupName = groupRows.length ? groupRows[0].name : 'A group';
  const memberIds = await getMembers(groupId).then((members) => members.map((m: any) => Number(m.id)));

  await pool.query(
    `
    DELETE FROM user_groups
    WHERE id = ?
    `,
    [groupId]
  );

  await notifyUsers(
    memberIds,
    'group_deleted',
    'Group deleted',
    `${groupName} was deleted`,
    {
      groupId,
      name: groupName
    },
    [],
    actorUserId
  );

};

export const addMember = async (groupId: number, userId: number, actorUserId?: number) => {

  await pool.query(
    `
    INSERT INTO group_members (group_id, user_id)
    VALUES (?, ?)
    `,
    [groupId, userId]
  );

  const [groupRows]: any = await pool.query(
    `
    SELECT name
    FROM user_groups
    WHERE id = ?
    LIMIT 1
    `,
    [groupId]
  );

  const groupName = groupRows.length ? groupRows[0].name : 'A group';

  await notifyUsers(
    [userId],
    'group_member_added',
    'Added to group',
    `You were added to ${groupName}`,
    {
      groupId,
      name: groupName
    },
    [],
    actorUserId
  );

};


export const getMembers = async (groupId: number) => {

  try {

    const [rows]: any = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.avatar_base64 AS avatarBase64,
        u.avatar_base64 AS avatar_base64,
        u.avatar_mime AS avatarMime,
        u.avatar_mime AS avatar_mime
      FROM group_members gm
      JOIN users u
        ON gm.user_id = u.id
      WHERE gm.group_id = ?
      `,
      [groupId]
    );

    return rows;

  } catch (error: any) {

    if (error?.code !== 'ER_BAD_FIELD_ERROR') {
      throw error;
    }

    const [rows]: any = await pool.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.avatar_base64 AS avatarBase64,
        u.avatar_base64 AS avatar_base64,
        NULL AS avatarMime,
        NULL AS avatar_mime
      FROM group_members gm
      JOIN users u
        ON gm.user_id = u.id
      WHERE gm.group_id = ?
      `,
      [groupId]
    );

    return rows;

  }

};


export const removeMember = async (groupId: number, userId: number, actorUserId?: number) => {

  const [groupRows]: any = await pool.query(
    `
    SELECT name
    FROM user_groups
    WHERE id = ?
    LIMIT 1
    `,
    [groupId]
  );

  const groupName = groupRows.length ? groupRows[0].name : 'a group';

  await pool.query(
    `
    DELETE FROM group_members
    WHERE group_id = ? AND user_id = ?
    `,
    [groupId, userId]
  );

  await notifyUsers(
    [userId],
    'group_member_removed',
    'Removed from group',
    `You were removed from ${groupName}`,
    {
      groupId,
      name: groupName
    },
    [],
    actorUserId
  );

};
