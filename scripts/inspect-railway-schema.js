import 'dotenv/config';
import { writeFile, mkdir } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.RAILWAY_DATABASE_URL) {
  console.error('RAILWAY_DATABASE_URL is required.');
  console.error('Run: node --env-file=.env.migration scripts/inspect-railway-schema.js');
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
    where table_schema not in ('pg_catalog', 'information_schema')
      and table_type = 'BASE TABLE'
    order by table_schema, table_name
  `);

  const columns = await client.query(`
    select table_schema, table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema not in ('pg_catalog', 'information_schema')
    order by table_schema, table_name, ordinal_position
  `);

  const indexes = await client.query(`
    select schemaname, tablename, indexname, indexdef
    from pg_indexes
    where schemaname not in ('pg_catalog', 'information_schema')
    order by schemaname, tablename, indexname
  `);

  const result = {
    capturedAt: new Date().toISOString(),
    tables: tables.rows,
    columns: columns.rows,
    indexes: indexes.rows,
  };

  await mkdir('docs', { recursive: true });
  await writeFile('docs/current-railway-schema.json', `${JSON.stringify(result, null, 2)}\n`);
  console.log('Schema written to docs/current-railway-schema.json');
} finally {
  await client.end();
}

