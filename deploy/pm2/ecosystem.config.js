// ───────────────────────────────────────────────────────────────────────────
// PM2 process file for the Haleelo Tower admin panel (Next.js).
// Usage on the server, from /var/www/haleelo/admin:
//   npm ci && npm run build
//   pm2 start /var/www/haleelo/deploy/pm2/ecosystem.config.js
//   pm2 save          # persist across reboots
//   pm2 startup       # print the systemd command to run once (enables boot start)
// ───────────────────────────────────────────────────────────────────────────

module.exports = {
  apps: [
    {
      name: 'haleelo-admin',
      cwd: '/var/www/haleelo/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/haleelo/admin-error.log',
      out_file: '/var/log/haleelo/admin-out.log',
      time: true,
    },
  ],
};
