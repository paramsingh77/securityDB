# Hospital Security Portal Rebuild

React + Node/Express + PostgreSQL rebuild for a hospital security desk portal.

Current priority:

1. Capture screenshots of the existing production app as UI reference.
2. Export the current Railway PostgreSQL database.
3. Restore it into Hostinger PostgreSQL.
4. Rebuild the app against the migrated schema.

The project is being prepared for Hostinger-style deployment, with environment-driven configuration and documented database migration steps.

## Project Layout

```text
client/                 React frontend
server/                 Node + Express API
database/migrations/    PostgreSQL schema migrations
docs/                   Deployment and migration runbooks
scripts/                Backup, restore, and migration helpers
```

## Important Data Note

Visitor logs are sensitive operational/security data. Avoid exposing real visitor data in screenshots, logs, GitHub issues, or support tickets. Use fake data for demos whenever possible.

