import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { eventsRouter } from './routes/events.js';
import { healthRouter } from './routes/health.js';
import { incidentsRouter } from './routes/incidents.js';
import { notificationsRouter } from './routes/notifications.js';
import { usersRouter } from './routes/users.js';
import { visitorsRouter } from './routes/visitors.js';
import { requireAdmin, requireAuth } from './middleware/auth.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

function rateLimit(windowMs, maxRequests) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs);

  return (req, res, next) => {
    const key = req.ip;
    const count = (hits.get(key) || 0) + 1;
    hits.set(key, count);
    if (count > maxRequests) {
      res.status(429).json({ error: 'Too many requests, please try again later' });
      return;
    }
    next();
  };
}

const authLimiter = rateLimit(15 * 60 * 1000, 20);
const writeLimiter = rateLimit(60 * 1000, 30);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/visitors', requireAuth, writeLimiter, visitorsRouter);
app.use('/api/events', requireAuth, writeLimiter, eventsRouter);
app.use('/api/incidents', requireAuth, writeLimiter, incidentsRouter);
app.use('/api/users', requireAuth, requireAdmin, usersRouter);
app.use('/api/notifications', requireAuth, notificationsRouter);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  if (err.name === 'ZodError') {
    const messages = err.issues.map((issue) => {
      const field = issue.path.join('.');
      return field ? `${field}: ${issue.message}` : issue.message;
    });
    res.status(400).json({ error: messages[0], details: messages });
    return;
  }

  if (err.code === '23505') {
    res.status(409).json({ error: 'A record with that value already exists' });
    return;
  }

  console.error({
    message: err.message,
    name: err.name,
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Hospital Security Portal API listening on port ${port}`);
});
