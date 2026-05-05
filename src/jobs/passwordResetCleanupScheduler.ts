import pool from '../config/db';

const DEFAULT_RETENTION_DAYS = 1;
const DEFAULT_INTERVAL_MINUTES = 60;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const startPasswordResetCleanupScheduler = () => {
  const retentionDays = parsePositiveInt(
    process.env.PASSWORD_RESET_CLEANUP_RETENTION_DAYS,
    DEFAULT_RETENTION_DAYS
  );

  const intervalMinutes = parsePositiveInt(
    process.env.PASSWORD_RESET_CLEANUP_INTERVAL_MINUTES,
    DEFAULT_INTERVAL_MINUTES
  );

  const intervalMs = intervalMinutes * 60 * 1000;

  const runCleanup = async () => {
    try {
      const [result]: any = await pool.query(
        `DELETE FROM password_reset_codes
         WHERE (used_at IS NOT NULL OR expires_at < NOW())
           AND created_at < NOW() - INTERVAL ? DAY`,
        [retentionDays]
      );

      const deletedRows = Number(result?.affectedRows ?? 0);

      if (deletedRows > 0) {
        console.log(
          `[password-reset] Cleaned up ${deletedRows} expired/used reset row(s) older than ${retentionDays} day(s)`
        );
      }
    } catch (error) {
      console.error('[password-reset] Cleanup job failed:', error);
    }
  };

  setTimeout(() => {
    runCleanup();
  }, 15000);

  setInterval(() => {
    runCleanup();
  }, intervalMs);

  console.log(
    `[password-reset] Cleanup scheduler started (every ${intervalMinutes} minute(s), retention ${retentionDays} day(s))`
  );
};