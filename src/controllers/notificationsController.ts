import { addClient, removeClient } from '../utils/sseManager';

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