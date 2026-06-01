import { Router } from 'express';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/query.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    employeeId: user.employee_id,
  };
}

async function verifyPassword(storedHash, password) {
  if (!storedHash) return false;
  if (storedHash.startsWith('$argon2')) return argon2.verify(storedHash, password);
  if (storedHash.startsWith('$2')) return bcrypt.compare(password, storedHash);
  return false;
}

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await query('select * from users where lower(email) = lower($1)', [input.email]);
    const user = result.rows[0];

    if (!user || !(await verifyPassword(user.password, input.password))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user);
    req.user = { sub: String(user.id), email: user.email, role: user.role, employeeId: user.employee_id };
    await audit(req, 'login', 'users', user.id);

    res.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query('select * from users where id = $1', [req.user.sub]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});
