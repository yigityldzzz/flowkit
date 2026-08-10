module.exports = {
  apps: [
    {
      name: 'flowkit-api',
      script: './apps/api/dist/index.js',
      cwd: '/var/www/flowkit',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'flowkit-web',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/var/www/flowkit/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
