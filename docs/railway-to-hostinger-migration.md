# Railway PostgreSQL to Hostinger PostgreSQL Migration

This runbook moves the current production database from Railway to Hostinger.

## Inputs Needed

- Railway PostgreSQL connection string.
- Hostinger PostgreSQL connection string.
- Hostinger target type: VPS PostgreSQL, Docker PostgreSQL, or managed database if available on the selected plan.
- Maintenance window approved by the team.
- Confirmation that users are logged out before final export.

## Migration Summary

1. Put the old app into maintenance/read-only mode if possible.
2. Inspect the Railway schema without exporting data.
3. Export Railway using `pg_dump`.
4. Restore the dump into Hostinger using `pg_restore`.
5. Run validation counts and key table spot checks.
6. Point the rebuilt/backend app to Hostinger `DATABASE_URL`.
7. Keep the Railway database untouched until the team signs off.

## Inspect Schema Only

This captures table, column, and index definitions without visitor records:

```bash
node --env-file=.env.migration scripts/inspect-railway-schema.js
```

Output:

```text
docs/current-railway-schema.json
```

## Local JSON Copy For Rebuild Reference

This exports table data into an ignored local folder. It is useful while rebuilding, but it is not a replacement for the final `pg_dump` migration.

```bash
node --env-file=.env.migration scripts/export-railway-json.js
```

Output:

```text
local-data/railway-json/
```

This folder can contain sensitive visitor/security data and must not be committed or shared casually.

## Export From Railway

Use custom dump format because it is safer for restore and validation:

```bash
pg_dump "$RAILWAY_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=railway-export.dump
```

## Restore To Hostinger

Create the target database first if Hostinger does not create it for you.

```bash
pg_restore \
  --dbname="$HOSTINGER_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  railway-export.dump
```

## Validate

Run table counts on both databases:

```bash
psql "$RAILWAY_DATABASE_URL" -c "\dt"
psql "$HOSTINGER_DATABASE_URL" -c "\dt"
```

Then compare important counts:

```bash
psql "$RAILWAY_DATABASE_URL" -c "select count(*) from visitors;"
psql "$HOSTINGER_DATABASE_URL" -c "select count(*) from visitors;"
```

Repeat for events, incidents, users, and audit logs once table names are confirmed.

## Security Rules

- Do not paste real connection strings into chat.
- Do not commit `.env`, dump files, SQL exports, or screenshots with real visitor names.
- Prefer encrypted transfer/storage for dump files.
- Rotate Railway and Hostinger database credentials after migration.
- Restrict Hostinger database access by firewall/IP where supported.

## Rollback

If validation fails, keep Railway as the source of truth and do not point production traffic to Hostinger. Fix restore errors, create a new Hostinger database, and repeat the migration.
