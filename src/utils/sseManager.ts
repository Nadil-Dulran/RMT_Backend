const clients: Record<number, any[]> = {};

// 🔹 Add client
export const addClient = (userId: number, res: any) => {

  if (!clients[userId]) {
    clients[userId] = [];
  }

  clients[userId].push(res);

};

// 🔹 Remove client
export const removeClient = (userId: number, res: any) => {

  if (!clients[userId]) return;

  clients[userId] = clients[userId].filter(r => r !== res);

};

// 🔹 Send event
export const sendNotification = (userId: number, data: any) => {

  const userClients = clients[userId];

  if (!userClients) return;

  userClients.forEach(res => {
    res.write('event: notification\n');
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

};