import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import profileRoutes from './routes/profileRoutes';
import groupsRoutes from './routes/groupsRoutes';
import expensesRoutes from './routes/expensesRoutes';
import settlementsRoutes from './routes/settlementsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/dashboard', dashboardRoutes);




app.get('/', (req, res) => {
  res.send('API is running...');
});

export default app;
