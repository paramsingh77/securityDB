import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

if (!process.env.RAILWAY_DATABASE_URL) {
  console.error('RAILWAY_DATABASE_URL is required.');
  console.error('Run: node --env-file=.env.migration scripts/export-railway-json.js');
  process.exit(1);
}

const { Client } = pg;
const client = new Client({
  connectionString: process.env.RAILWAY_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const outputDir = path.resolve('local-data/railway-json');

await mkdir(outputDir, { recursive: true });
await client.connect();

try {
  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `);

  const manifest = {
    exportedAt: new Date().toISOString(),
    tables: [],
  };

  for (const { table_name: tableName } of tables.rows) {
    const result = await client.query(`select * from public."${tableName}"`);
    const file = `${tableName}.json`;
    await writeFile(path.join(outputDir, file), `${JSON.stringify(result.rows, null, 2)}\n`);
    manifest.tables.push({ table: tableName, rows: result.rowCount, file });
    console.log(`${tableName}: ${result.rowCount} rows`);
  }

  await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Export written to ${outputDir}`);
} finally {
  await client.end();
}

