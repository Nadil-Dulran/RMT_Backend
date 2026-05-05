import dotenv from 'dotenv';
import app from './app';
import pool from './config/db';
import { startNotificationPurgeScheduler } from './jobs/notificationPurgeScheduler';
import { startPasswordResetCleanupScheduler } from './jobs/passwordResetCleanupScheduler';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await pool.getConnection();
    console.log('✅ MySQL Connected');
    startNotificationPurgeScheduler();
    startPasswordResetCleanupScheduler();
    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

startServer();
