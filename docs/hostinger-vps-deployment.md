# Hostinger VPS Deployment Guide

This project should be deployed to a **Hostinger VPS** if PostgreSQL must also live at Hostinger. Hostinger Web/Cloud hosting can run some Node.js apps, but Hostinger states PostgreSQL requires VPS-level access.

The production shape is:

```text
Browser
  -> Nginx HTTPS
  -> Node/Express app on localhost:3000
  -> PostgreSQL on localhost:5432
```

The React frontend is built into `client/dist/` and served by the Express app when `NODE_ENV=production`.

## 1. Prepare The Repo

Commit and push the app to a private GitHub repository.

Do not commit:

- `.env`
- `.env.*`
- `local-data/`
- `production-screenshots/`
- database dumps

## 2. Create Hostinger VPS

Recommended baseline:

- Ubuntu 22.04 or 24.04
- Node.js 22 LTS
- PostgreSQL
- Nginx
- PM2
- Certbot / Let's Encrypt SSL

## 3. Install Server Packages

SSH into the VPS:

```bash
ssh root@YOUR_SERVER_IP
```

Install base packages:

```bash
apt update
apt upgrade -y
apt install -y nginx git curl postgresql postgresql-contrib postgresql-client
```

Install Node 22 with NVM:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
npm install -g pm2
```

## 4. Create PostgreSQL Database

Create an app database and user:

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
create user hsp_app with encrypted password 'REPLACE_WITH_STRONG_PASSWORD';
create database hospital_security_portal owner hsp_app;
grant all privileges on database hospital_security_portal to hsp_app;
\q
```

Your Hostinger local database URL will be:

```text
postgresql://hsp_app:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/hospital_security_portal
```

## 5. Clone And Build App

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_PRIVATE_GITHUB_REPO_URL hospital-security-portal
cd hospital-security-portal
npm ci
npm run build
```

Create production env file:

```bash
nano .env
```

Use:

```bash
NODE_ENV=production
PORT=3000
CLIENT_ORIGIN=https://YOUR_DOMAIN
DATABASE_URL=postgresql://hsp_app:REPLACE_WITH_STRONG_PASSWORD@localhost:5432/hospital_security_portal
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
```

Generate a JWT secret:

```bash
openssl rand -hex 32
```

## 6. Copy Railway Data To Hostinger

Run this from the Hostinger VPS after the repo is cloned and PostgreSQL is installed.

Temporarily export the Railway URL and Hostinger URL:

```bash
export RAILWAY_DATABASE_URL='postgresql://RAILWAY_USER:RAILWAY_PASSWORD@RAILWAY_HOST:RAILWAY_PORT/RAILWAY_DB'
export HOSTINGER_DATABASE_URL='postgresql://hsp_app:HOSTINGER_PASSWORD@localhost:5432/hospital_security_portal'
```

Run the migration:

```bash
./scripts/migrate-railway-to-hostinger.sh
```

This script:

1. Runs `pg_dump` against Railway.
2. Restores the dump into Hostinger PostgreSQL.
3. Applies `database/migrations/002_legacy_indexes_and_audit.sql`.

After migration, remove the temporary shell history entry or rotate credentials if needed.

Verify counts:

```bash
psql "$HOSTINGER_DATABASE_URL" -c "select count(*) from visitors;"
psql "$HOSTINGER_DATABASE_URL" -c "select count(*) from events;"
psql "$HOSTINGER_DATABASE_URL" -c "select count(*) from incidents;"
psql "$HOSTINGER_DATABASE_URL" -c "select count(*) from users;"
```

Expected approximate counts from Railway snapshot:

```text
visitors: 66700+
events: 45094
incidents: 426
users: 28
```

## 7. Start App With PM2

```bash
cd /var/www/hospital-security-portal
pm2 start app.js --name hospital-security-portal
pm2 save
pm2 startup
```

Run the command printed by `pm2 startup`.

Check logs:

```bash
pm2 logs hospital-security-portal
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## 8. Configure Nginx

Create an Nginx site:

```bash
nano /etc/nginx/sites-available/hospital-security-portal
```

Use:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/hospital-security-portal /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 9. Enable HTTPS

Install Certbot:

```bash
apt install -y certbot python3-certbot-nginx
```

Issue SSL:

```bash
certbot --nginx -d YOUR_DOMAIN
```

## 10. Final App Verification

Open:

```text
https://YOUR_DOMAIN
```

Verify:

- Login works.
- Notification count loads.
- Visitor list loads and paginates.
- Event list/search loads.
- Incident filters load.
- User Management loads for admin users.
- Create/update/delete actions work.
- No browser console errors.
- `pm2 logs hospital-security-portal` has no PHI-heavy output.

## Important Architecture Note

Do **not** put the PostgreSQL URL in React frontend code.

Correct:

```text
React frontend -> /api -> Express backend -> PostgreSQL
```

The database link belongs only in the server-side `.env`:

```bash
DATABASE_URL=postgresql://...
```

The frontend should call relative API URLs like `/api/events`, which it already does.

