import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-only-change-me');
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role || 'user',
      employeeId: user.employee_id,
      name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    },
    jwtSecret,
    { expiresIn: '12h' },
  );
}

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function validateId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid ID parameter' });
    return;
  }
  req.params.id = String(id);
  next();
}
