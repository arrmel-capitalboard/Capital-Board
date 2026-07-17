// Config PM2 — gestion du process 24/7 sur la VM GCP.
// Usage : pm2 start ecosystem.config.js  puis  pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: 'capitalboard-bot',
      script: 'src/index.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 10,
      // e2-micro = 1 Go RAM : on redémarre si le bot dépasse 300 Mo.
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
