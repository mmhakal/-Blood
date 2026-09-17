import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

export interface CreateNotificationParams {
  lab_id?: string | null;
  user_id?: string | null;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  link?: string | null;
}

/**
 * Creates an in-app notification for a specific user, an entire laboratory, or global super admin.
 */
export async function createNotification(params: CreateNotificationParams): Promise<string> {
  const id = `notif-${uuidv4().substring(0, 8)}`;
  const type = params.type || 'info';

  await db.execute(
    `INSERT INTO notifications (id, lab_id, user_id, title, message, type, is_read, link)
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7)`,
    [id, params.lab_id || null, params.user_id || null, params.title, params.message, type, params.link || null]
  );

  return id;
}

/**
 * Creates system announcements for all laboratories and staff
 */
export async function broadcastAnnouncement(title: string, message: string, link?: string): Promise<void> {
  await createNotification({
    lab_id: null,
    user_id: null,
    title,
    message,
    type: 'info',
    link
  });
}

/**
 * Checks for laboratories with expiring subscriptions and issues alerts
 */
export async function checkExpiringSubscriptionsAndAlert(): Promise<number> {
  const now = new Date();
  const warningWindow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days ahead

  const expiringLabs = await db.query<{
    id: string;
    name: string;
    subscription_end: string;
  }>(
    `SELECT id, name, subscription_end
     FROM laboratories
     WHERE status = 'active'
       AND subscription_end IS NOT NULL
       AND subscription_end <= $1
       AND subscription_end > $2`,
    [warningWindow.toISOString(), now.toISOString()]
  );

  let notifiedCount = 0;
  for (const lab of expiringLabs) {
    const daysLeft = Math.ceil((new Date(lab.subscription_end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    // Check if recently notified today
    const existing = await db.queryOne(
      `SELECT id FROM notifications 
       WHERE lab_id = $1 AND title LIKE '%Subscription Expiring%' 
       AND created_at >= date('now', '-1 day')`,
      [lab.id]
    );

    if (!existing) {
      await createNotification({
        lab_id: lab.id,
        title: '⚠️ Subscription Expiring Soon',
        message: `Your facility subscription will expire in ${daysLeft} day(s). Please renew promptly to ensure uninterrupted clinical testing.`,
        type: 'warning',
        link: '/subscriptions'
      });
      notifiedCount++;
    }
  }

  return notifiedCount;
}

export const NotificationService = {
  create: createNotification,
  broadcast: broadcastAnnouncement,
  sendInApp: async (
    labId: string | null,
    userId: string | null,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'danger' = 'info',
    link?: string | null
  ) => {
    return createNotification({ lab_id: labId, user_id: userId, title, message, type, link });
  },
  checkExpiringSubscriptions: checkExpiringSubscriptionsAndAlert
};

export default NotificationService;
