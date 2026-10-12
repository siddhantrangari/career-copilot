module.exports = {
  apps: [
    {
      name: 'career-copilot-os',
      script: 'server/src/index.js',
      cwd: '/var/www/career-copilot-os',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 4011,
      },
      error_file: '/var/log/career-copilot-os-err.log',
      out_file: '/var/log/career-copilot-os-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
