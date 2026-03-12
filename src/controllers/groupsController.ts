import { Request, Response } from 'express';
import * as groupsService from '../services/groupsService';

export const createGroup = async (req: any, res: Response) => {

  try {

    const userId = req.userId;
    const { name, description, emoji } = req.body;

    const group = await groupsService.createGroup(
      userId,
      name,
      description,
      emoji
    );

    res.status(201).json(group);

  } catch (error) {

    res.status(500).json({ message: 'Failed to create group' });

  }

};


export const getGroups = async (req: any, res: Response) => {

  try {

    const userId = req.userId;

    const groups = await groupsService.getGroups(userId);

    res.json(groups);

  } catch (error) {

    res.status(500).json({ message: 'Failed to fetch groups' });

  }

};


export const getGroupById = async (req: Request, res: Response) => {

  try {

    const { id } = req.params;

    const group = await groupsService.getGroupById(Number(id));

    res.json(group);

  } catch (error) {

    res.status(500).json({ message: 'Failed to fetch group' });

  }

};


export const updateGroup = async (req: Request, res: Response) => {

  try {

    const { id } = req.params;
    const { name, description, emoji } = req.body;

    await groupsService.updateGroup(Number(id), name, description, emoji);

    res.json({ message: 'Group updated successfully' });

  } catch (error) {

    res.status(500).json({ message: 'Failed to update group' });

  }

};


export const deleteGroup = async (req: Request, res: Response) => {

  try {

    const { id } = req.params;

    await groupsService.deleteGroup(Number(id));

    res.json({ message: 'Group deleted successfully' });

  } catch (error) {

    res.status(500).json({ message: 'Failed to delete group' });

  }

};

export const addMember = async (req: any, res: Response) => {

  try {

    const groupId = Number(req.params.id);
    const { userId } = req.body;

    await groupsService.addMember(groupId, userId);

    res.json({ message: 'Member added successfully' });

  } catch (error) {

    res.status(500).json({ message: 'Failed to add member' });

  }

};


export const getMembers = async (req: any, res: Response) => {

  try {

    const groupId = Number(req.params.id);

    const members = await groupsService.getMembers(groupId);

    res.json(members);

  } catch (error) {

    res.status(500).json({ message: 'Failed to fetch members' });

  }

};


export const removeMember = async (req: any, res: Response) => {

  try {

    const groupId = Number(req.params.id);
    const userId = Number(req.params.userId);

    await groupsService.removeMember(groupId, userId);

    res.json({ message: 'Member removed' });

  } catch (error) {

    res.status(500).json({ message: 'Failed to remove member' });

  }

};
