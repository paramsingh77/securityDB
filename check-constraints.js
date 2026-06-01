import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const res = await pool.query(`
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid = 'incidents'::regclass AND contype = 'c'
`);
console.log('Check constraints on incidents table:');
for (const row of res.rows) {
  console.log(`  ${row.conname}: ${row.pg_get_constraintdef}`);
}

// Also show what values currently exist
const statuses = await pool.query('SELECT DISTINCT status FROM incidents WHERE status IS NOT NULL');
console.log('\nExisting status values:', statuses.rows.map(r => r.status));

const approvals = await pool.query('SELECT DISTINCT approval_status FROM incidents WHERE approval_status IS NOT NULL');
console.log('Existing approval_status values:', approvals.rows.map(r => r.approval_status));

await pool.end();
