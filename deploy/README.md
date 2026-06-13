# Haleelo Tower — Deployment Artifacts

Operational companion to **Section 20** of the Implementation Plan v3.1. These
files are templates — replace every `YOUR_DOMAIN` / `CHANGE_ME` placeholder
before use.

```
deploy/
├── nginx/
│   ├── api.haleelo.conf        # Laravel API vhost (PHP-FPM)
│   └── admin.haleelo.conf      # Next.js admin reverse-proxy vhost
├── pm2/
│   └── ecosystem.config.js     # PM2 process for the Next.js app
├── supervisor/
│   └── haleelo-worker.conf     # Queue worker (only if QUEUE_CONNECTION!=sync)
├── cron/
│   └── haleelo-scheduler.cron  # Laravel scheduler entry
├── env/
│   ├── api.env.example         # → /var/www/haleelo/api/.env
│   └── admin.env.example       # → /var/www/haleelo/admin/.env.production
└── scripts/
    └── deploy.sh               # pull + migrate + rebuild + reload
```

## Target layout on the server

```
/var/www/haleelo/        ← git clone of this repo
  ├── api/               ← Laravel
  └── admin/             ← Next.js
/var/log/haleelo/        ← create: sudo mkdir -p /var/log/haleelo && sudo chown www-data:www-data /var/log/haleelo
```

## First-time setup (Ubuntu 22.04+)

1. **Packages**: nginx, php8.3-{fpm,cli,pgsql,mbstring,xml,curl,zip,gd,bcmath},
   postgresql, composer, nodejs 20.x, npm, `npm i -g pm2`, certbot +
   python3-certbot-nginx, supervisor.
2. **Database**:
   ```sql
   CREATE DATABASE haleelo;
   CREATE USER haleelo WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
   GRANT ALL PRIVILEGES ON DATABASE haleelo TO haleelo;
   ```
3. **Code**: `git clone … /var/www/haleelo` then
   `sudo chown -R www-data:www-data /var/www/haleelo`.
4. **API**:
   ```bash
   cd /var/www/haleelo/api
   cp /var/www/haleelo/deploy/env/api.env.example .env   # then edit
   composer install --no-dev --optimize-autoloader
   php artisan key:generate
   php artisan migrate --force
   php artisan db:seed --force          # roles, permissions, chart of accounts
   php artisan storage:link
   php artisan config:cache && php artisan route:cache
   ```
5. **Admin**:
   ```bash
   cd /var/www/haleelo/admin
   cp /var/www/haleelo/deploy/env/admin.env.example .env.production   # then edit
   npm ci && npm run build
   pm2 start /var/www/haleelo/deploy/pm2/ecosystem.config.js
   pm2 save && pm2 startup        # run the printed command once
   ```
6. **Nginx**: copy both vhosts into `/etc/nginx/sites-available/`, symlink into
   `sites-enabled/`, `nginx -t`, `systemctl reload nginx`.
7. **SSL**: `certbot --nginx -d api.YOUR_DOMAIN -d admin.YOUR_DOMAIN`.
8. **Scheduler**: install `cron/haleelo-scheduler.cron` for the `www-data` user.
9. **Worker** *(only if you set `QUEUE_CONNECTION=database`)*: copy
   `supervisor/haleelo-worker.conf` to `/etc/supervisor/conf.d/`, then
   `supervisorctl reread && supervisorctl update`.

## Routine redeploys

```bash
bash /var/www/haleelo/deploy/scripts/deploy.sh
```

## Smoke test after deploy

- `curl -I https://api.YOUR_DOMAIN/api/health` (or any public route) → 200.
- Open `https://admin.YOUR_DOMAIN`, log in, confirm the dashboard loads, the
  🔔 bell and ⌘K search respond, and a PDF (e.g. an invoice) downloads.
- `php artisan tinker` → check the DB connection if anything 500s.

## Gotchas baked into these templates

- **CORS**: `config/cors.php` now reads `CORS_ALLOWED_ORIGINS` (comma-separated)
  on top of the localhost defaults — set it to your admin URL or login will fail
  with CORS errors.
- **NEXT_PUBLIC_API_URL is build-time**: change it → `npm run build` again.
- **Upload size**: Nginx `client_max_body_size 12M` must be matched by PHP
  `upload_max_filesize`/`post_max_size` in `php.ini`.
- **Queue**: pilot default `QUEUE_CONNECTION=sync` runs jobs inline; the
  Supervisor worker is only needed once you move to `database`.
