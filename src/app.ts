import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import profileRoutes from './routes/profileRoutes';
import groupsRoutes from './routes/groupsRoutes';
import expensesRoutes from './routes/expensesRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/expenses', expensesRoutes);




app.get('/', (req, res) => {
  res.send('API is running...');
});

export default app;
