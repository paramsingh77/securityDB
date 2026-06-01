import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/query.js';
import { audit } from '../lib/audit.js';
import { pagedResponse, pagination } from '../lib/pagination.js';
import { validateId } from '../middleware/auth.js';

export const eventsRouter = Router();

const eventSchema = z.object({
  dateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Invalid date-time format (expected YYYY-MM-DDTHH:MM)'),
  zone: z.string().trim().min(1, 'Zone is required').max(255),
  category: z.string().trim().min(1, 'Category is required').max(100),
  narrative: z.string().trim().min(1, 'Narrative is required'),
  status: z.enum(['Open', 'Closed']).default('Open'),
});

eventsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = pagination(req);
    const params = [];
    const filters = [];
    if (req.query.search) {
      params.push(`%${String(req.query.search).toLowerCase()}%`);
      filters.push(`(lower(zone) like $${params.length} or lower(category) like $${params.length} or lower(narrative) like $${params.length})`);
    }
    const where = filters.length ? `where ${filters.join(' and ')}` : '';
    const count = await query(`select count(*)::int as total from events ${where}`, params);
    params.push(limit, offset);
    const result = await query(
      `select e.*, u.first_name, u.last_name, u.employee_id
       from events e
       left join users u on u.id = e.user_id
       ${where}
       order by e.date_time desc
       limit $${params.length - 1} offset $${params.length}`,
      params,
    );
    res.json(pagedResponse(result.rows, count.rows[0].total, page, limit));
  } catch (error) {
    next(error);
  }
});

eventsRouter.post('/', async (req, res, next) => {
  try {
    const input = eventSchema.parse(req.body);
    const result = await withTransaction(async (client) => {
      const inserted = await client.query(
        `insert into events (date_time, user_id, zone, category, narrative, status, event_number)
         values ($1, $2, $3, $4, $5, $6, nextval('events_event_number_seq'))
         returning *`,
        [input.dateTime, req.user.sub, input.zone, input.category, input.narrative, input.status],
      );
      return inserted;
    });
    await audit(req, 'create', 'events', result.rows[0].id);
    res.status(201).json({ event: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

eventsRouter.put('/:id', validateId, async (req, res, next) => {
  try {
    const input = eventSchema.parse(req.body);

    const existing = await query('select user_id from events where id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    if (String(existing.rows[0].user_id) !== String(req.user.sub) && req.user.role !== 'admin') {
      res.status(403).json({ error: 'You can only edit your own events' });
      return;
    }

    const result = await query(
      `update events
       set date_time = $1, zone = $2, category = $3, narrative = $4, status = $5
       where id = $6
       returning *`,
      [input.dateTime, input.zone, input.category, input.narrative, input.status, req.params.id],
    );
    await audit(req, 'update', 'events', req.params.id);
    res.json({ event: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

eventsRouter.delete('/:id', validateId, async (req, res, next) => {
  try {
    const existing = await query('select user_id from events where id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    if (String(existing.rows[0].user_id) !== String(req.user.sub) && req.user.role !== 'admin') {
      res.status(403).json({ error: 'You can only delete your own events' });
      return;
    }

    await query('delete from events where id = $1', [req.params.id]);
    await audit(req, 'delete', 'events', req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
