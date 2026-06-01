import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
const { Pool } = pg;


const connectionString = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

// Disable pg's automatic Date parsing for timestamp columns — return raw strings instead
const { types } = pg;
types.setTypeParser(1114, (val) => val); // timestamp without time zone
types.setTypeParser(1184, (val) => val); // timestamp with time zone

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' || connectionString.includes('railway')
    ? { rejectUnauthorized: false }
    : undefined,
});
