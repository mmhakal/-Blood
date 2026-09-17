import { Router, Response } from 'express';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { broadcastAnnouncement, createNotification } from '../services/notificationService';

const router = Router();

// GET /api/notifications - List notifications for the authenticated user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const isUnreadOnly = req.query.unread === 'true';
    const limit = parseInt(req.query.limit as string || '30', 10);

    let query = '';
    const params: any[] = [];

    if (user.role_code === 'super_admin') {
      // Super Admin sees global notifications, super_admin targeted notifications, or system alerts
      query = `
        SELECT id, lab_id, user_id, title, message, type, is_read, link, created_at
        FROM notifications
        WHERE (user_id = $1 OR user_id IS NULL)
          ${isUnreadOnly ? 'AND is_read = 0' : ''}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      params.push(user.id);
    } else {
      // Tenant user sees lab notifications, user-specific notifications, or system announcements
      query = `
        SELECT id, lab_id, user_id, title, message, type, is_read, link, created_at
        FROM notifications
        WHERE (user_id = $1 OR lab_id = $2 OR (lab_id IS NULL AND user_id IS NULL))
          ${isUnreadOnly ? 'AND is_read = 0' : ''}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
      params.push(user.id, user.lab_id);
    }

    const rows = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count - Unread counter for bell badge
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    let countRow: { count: number } | null = null;

    if (user.role_code === 'super_admin') {
      countRow = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND is_read = 0`,
        [user.id]
      );
    } else {
      countRow = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications
         WHERE (user_id = $1 OR lab_id = $2 OR (lab_id IS NULL AND user_id IS NULL))
           AND is_read = 0`,
        [user.id, user.lab_id]
      );
    }

    res.json({ unread_count: countRow ? Number(countRow.count) : 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await db.execute(`UPDATE notifications SET is_read = 1 WHERE id = $1`, [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/mark-all-read - Mark all relevant notifications as read
router.put('/mark-all-read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role_code === 'super_admin') {
      await db.execute(`UPDATE notifications SET is_read = 1 WHERE (user_id = $1 OR user_id IS NULL)`, [user.id]);
    } else {
      await db.execute(
        `UPDATE notifications SET is_read = 1 WHERE (user_id = $1 OR lab_id = $2 OR (lab_id IS NULL AND user_id IS NULL))`,
        [user.id, user.lab_id]
      );
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/broadcast - Super Admin system announcement
router.post('/broadcast', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { title, message, link, type } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required' });
    return;
  }

  try {
    await createNotification({
      lab_id: null,
      user_id: null,
      title,
      message,
      type: type || 'info',
      link
    });

    res.status(201).json({ message: 'System announcement broadcasted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
