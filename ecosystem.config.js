module.exports = {
  apps: [
    {
      name: 'hyrost-website',
      script: 'backend/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3044
        // JWT_SECRET, DB_*, MINECRAFT_BRIDGE_KEY, ALLOWED_ORIGINS → dari file .env (root)
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3044
        // Wajib di .env: JWT_SECRET, MINECRAFT_BRIDGE_KEY, ALLOWED_ORIGINS, DB_*
      }
    }
  ]
};
