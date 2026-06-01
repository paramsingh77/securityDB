# Production Access Notes

Create an ignored local file named `.env.production-login` before capturing screenshots:

```bash
PRODUCTION_APP_URL="https://frontend-service-production-6fb4.up.railway.app/dashboard"
PRODUCTION_LOGIN_EMAIL="user@example.com"
PRODUCTION_LOGIN_PASSWORD="replace-me"
```

Run:

```bash
node --env-file=.env.production-login scripts/capture-production-screenshots.js
```

Screenshots are written to `production-screenshots/`, which is ignored by Git because production screens may contain sensitive visitor/security data.

After using shared credentials in a development environment, rotate the password if this is a real account.

Do not commit `.env.production-login` or `production-screenshots/`.
