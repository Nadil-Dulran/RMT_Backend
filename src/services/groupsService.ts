import pool from '../config/db';

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
  emoji?: string
) => {

  await pool.query(
    `
    UPDATE user_groups
    SET name = ?, description = ?, emoji = ?
    WHERE id = ?
    `,
    [name, description, emoji, groupId]
  );

};


export const deleteGroup = async (groupId: number) => {

  await pool.query(
    `
    DELETE FROM user_groups
    WHERE id = ?
    `,
    [groupId]
  );

};

export const addMember = async (groupId: number, userId: number) => {

  await pool.query(
    `
    INSERT INTO group_members (group_id, user_id)
    VALUES (?, ?)
    `,
    [groupId, userId]
  );

};


export const getMembers = async (groupId: number) => {

  const [rows]: any = await pool.query(
    `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.avatar_url
    FROM group_members gm
    JOIN users u
      ON gm.user_id = u.id
    WHERE gm.group_id = ?
    `,
    [groupId]
  );

  return rows;

};


export const removeMember = async (groupId: number, userId: number) => {

  await pool.query(
    `
    DELETE FROM group_members
    WHERE group_id = ? AND user_id = ?
    `,
    [groupId, userId]
  );

};
