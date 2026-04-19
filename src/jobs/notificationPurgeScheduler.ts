import { purgeReadNotificationsForAllUsers } from '../services/notificationsService';

const DEFAULT_RETENTION_DAYS = 2;
const DEFAULT_INTERVAL_MINUTES = 60;

const parsePositiveInt = (value: string | undefined, fallback: number): number => {

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;

};

export const startNotificationPurgeScheduler = () => {

  const retentionDays = parsePositiveInt(
    process.env.NOTIFICATION_PURGE_OLDER_THAN_DAYS,
    DEFAULT_RETENTION_DAYS
  );

  const intervalMinutes = parsePositiveInt(
    process.env.NOTIFICATION_PURGE_INTERVAL_MINUTES,
    DEFAULT_INTERVAL_MINUTES
  );

  const intervalMs = intervalMinutes * 60 * 1000;

  const runPurge = async () => {
    try {
      const deleted = await purgeReadNotificationsForAllUsers(retentionDays);
      if (deleted > 0) {
        console.log(`[notifications] Purged ${deleted} read notifications older than ${retentionDays} day(s)`);
      }
    } catch (error) {
      console.error('[notifications] Scheduled purge failed:', error);
    }
  };

  // Run once shortly after startup, then continue on interval.
  setTimeout(() => {
    runPurge();
  }, 15000);

  setInterval(() => {
    runPurge();
  }, intervalMs);

  console.log(`[notifications] Purge scheduler started (every ${intervalMinutes} minute(s), retention ${retentionDays} day(s))`);

};
