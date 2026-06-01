import { Router } from 'express';
import { query } from '../db/query.js';

export const notificationsRouter = Router();

notificationsRouter.get('/unread-count', async (req, res, next) => {
  try {
    const result = await query(
      `select count(*)::int as count
       from notifications
       where user_id = $1 and coalesce(is_read, false) = false`,
      [req.user.sub],
    );
    res.json({ count: result.rows[0].count });
  } catch (error) {
    next(error);
  }
});

