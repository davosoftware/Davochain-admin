/**
 * PM2 settings for the DavoChain admin dashboard on the live server
 * (Reports/PM2_VPS_GUIDE.md in the workspace).
 *
 *   pm2 startOrReload ecosystem.config.js --update-env
 *
 * Runs the built dashboard (`npm run build`) the same way `npm start` does:
 * only on this server (127.0.0.1), port 3100; Nginx puts it on the internet.
 * API_URL is where the dashboard finds the API on the same server.
 */
module.exports = {
  apps: [
    {
      name: 'davochain-admin',
      cwd: __dirname,
      script: require.resolve('next/dist/bin/next'),
      args: 'start -H 127.0.0.1 -p 3100',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        API_URL: process.env.API_URL || 'http://127.0.0.1:3000',
      },
      kill_timeout: 10_000,
      exp_backoff_restart_delay: 200,
      max_memory_restart: '700M',
      time: true,
    },
  ],
};
