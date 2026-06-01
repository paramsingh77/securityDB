import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/query.js';
import { audit } from '../lib/audit.js';
import { pagedResponse, pagination } from '../lib/pagination.js';
import { validateId } from '../middleware/auth.js';

export const usersRouter = Router();

const createUserSchema = z.object({
  employeeId: z.coerce.number().int().positive('Employee ID must be a positive number'),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'user']).default('user'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

usersRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = pagination(req, 25, 100);
    const params = [];
    const filters = [];
    if (req.query.search) {
      params.push(`%${String(req.query.search).toLowerCase()}%`);
      filters.push(`(
        lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) like $${params.length}
        or lower(email) like $${params.length}
        or cast(employee_id as text) like $${params.length}
      )`);
    }
    const where = filters.length ? `where ${filters.join(' and ')}` : '';
    const count = await query(`select count(*)::int as total from users ${where}`, params);
    params.push(limit, offset);
    const result = await query(
      `select id, email, first_name, last_name, role, created_at, employee_id
       from users
       ${where}
       order by lower(coalesce(last_name, '')), lower(coalesce(first_name, ''))
       limit $${params.length - 1} offset $${params.length}`,
      params,
    );
    res.json(pagedResponse(result.rows, count.rows[0].total, page, limit));
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/', async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);

    const duplicate = await query(
      'select id from users where lower(email) = lower($1) or employee_id = $2',
      [input.email, input.employeeId],
    );
    if (duplicate.rows.length > 0) {
      res.status(409).json({ error: 'A user with this email or employee ID already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const result = await query(
      `insert into users (employee_id, first_name, last_name, email, role, password, created_at)
       values ($1, $2, $3, $4, $5, $6, now())
       returning id, email, first_name, last_name, role, created_at, employee_id`,
      [input.employeeId, input.firstName, input.lastName, input.email, input.role, passwordHash],
    );
    await audit(req, 'create', 'users', result.rows[0].id);
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

usersRouter.patch('/:id/reset-password', validateId, async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const existing = await query('select id from users where id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    await query('update users set password = $1 where id = $2', [passwordHash, req.params.id]);
    await audit(req, 'update', 'users', req.params.id, { action: 'password_reset' });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete('/:id', validateId, async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user.sub)) {
      res.status(400).json({ error: 'You cannot delete your own account' });
      return;
    }
    const result = await query('delete from users where id = $1 returning id', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await audit(req, 'delete', 'users', req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
