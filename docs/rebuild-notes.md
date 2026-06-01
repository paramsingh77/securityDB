# Rebuild Notes

This is a brand-new implementation. The lost React/Node source code is not required.

## Reference Sources

- Screenshots of the current production app, if it is still reachable.
- Railway PostgreSQL schema and data, if the existing database is still reachable.
- User-provided module requirements.

The current Railway schema has been captured in `docs/current-railway-schema.json` and summarized in `docs/current-railway-schema-summary.md`.

## Build Order

1. Preserve current Railway table compatibility for migration.
2. Authentication, roles, and user management.
3. Audit logging for all create/update/delete operations.
4. Visitor check-in with server-side filtering and pagination.
5. Event reporting with current `events` table compatibility.
6. Incident reporting with current `incidents` table compatibility.
7. Hostinger deployment and PostgreSQL backup/restore process.

## Hostinger Notes

For PostgreSQL, use a Hostinger VPS or another Hostinger plan that gives proper PostgreSQL support. The app should be configured with `DATABASE_URL`, not hard-coded database details.
