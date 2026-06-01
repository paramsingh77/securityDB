import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/query.js';
import { audit } from '../lib/audit.js';
import { pagedResponse, pagination } from '../lib/pagination.js';
import { validateId } from '../middleware/auth.js';

export const visitorsRouter = Router();

const createVisitorSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  roomNumber: z.coerce.number().int().positive().optional().nullable(),
  checkInTime: z.string().optional().nullable(),
});

visitorsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = pagination(req);
    const filters = [];
    const params = [];

    if (req.query.dateFrom) {
      params.push(req.query.dateFrom);
      filters.push(`check_in_time >= $${params.length}`);
    }
    if (req.query.dateTo) {
      params.push(req.query.dateTo);
      filters.push(`check_in_time < ($${params.length}::date + interval '1 day')`);
    }
    if (req.query.search) {
      params.push(`%${String(req.query.search).toLowerCase()}%`);
      filters.push(`(lower(first_name) like $${params.length} or lower(last_name) like $${params.length})`);
    }

    const where = filters.length ? `where ${filters.join(' and ')}` : '';
    const count = await query(`select count(*)::int as total from visitors ${where}`, params);
    params.push(limit, offset);
    const result = await query(
      `select visitor_id, first_name, last_name, check_in_time, check_out_time, status, room_number
       from visitors
       ${where}
       order by check_in_time desc
       limit $${params.length - 1} offset $${params.length}`,
      params,
    );

    res.json(pagedResponse(result.rows, count.rows[0].total, page, limit));
  } catch (error) {
    next(error);
  }
});

visitorsRouter.post('/', async (req, res, next) => {
  try {
    const input = createVisitorSchema.parse(req.body);
    const checkInTime = input.checkInTime || null;
    const result = await query(
      `insert into visitors (first_name, last_name, check_in_time, status, valid_until, room_number)
       values ($1, $2, coalesce($4::timestamp, now()), 'Checked In', coalesce($4::timestamp, now()) + interval '1 day', $3)
       returning *`,
      [input.firstName, input.lastName, input.roomNumber || null, checkInTime],
    );
    await audit(req, 'create', 'visitors', result.rows[0].visitor_id);
    res.status(201).json({ visitor: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

visitorsRouter.patch('/:id/check-out', validateId, async (req, res, next) => {
  try {
    const existing = await query(
      `select visitor_id, status from visitors where visitor_id = $1`,
      [req.params.id],
    );
    if (!existing.rows[0]) {
      res.status(404).json({ error: 'Visitor not found' });
      return;
    }
    if (existing.rows[0].status === 'Checked Out') {
      res.status(400).json({ error: 'Visitor is already checked out' });
      return;
    }

    const result = await query(
      `update visitors
       set status = 'Checked Out', check_out_time = now()
       where visitor_id = $1
       returning *`,
      [req.params.id],
    );
    await audit(req, 'update', 'visitors', req.params.id, { status: 'Checked Out' });
    res.json({ visitor: result.rows[0] });
  } catch (error) {
    next(error);
  }
});
