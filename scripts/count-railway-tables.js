import 'dotenv/config';
import pg from 'pg';

if (!process.env.RAILWAY_DATABASE_URL) {
  console.error('RAILWAY_DATABASE_URL is required.');
  console.error('Run: node --env-file=.env.migration scripts/count-railway-tables.js');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  const tables = await client.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `);

  for (const table of tables.rows) {
    const safeName = `"${table.table_schema}"."${table.table_name}"`;
    const count = await client.query(`select count(*)::int as count from ${safeName}`);
    console.log(`${table.table_name}: ${count.rows[0].count}`);
  }
} finally {
  await client.end();
}

