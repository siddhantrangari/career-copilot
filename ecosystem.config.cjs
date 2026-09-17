module.exports = {
  apps: [
    {
      name: 'career-copilot-api',
      script: 'server/src/index.js',
      cwd: '/var/www/career-copilot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4005,
      },
      env_file: '/var/www/career-copilot/.env.production',
      error_file: '/var/log/career-copilot-api-err.log',
      out_file: '/var/log/career-copilot-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
