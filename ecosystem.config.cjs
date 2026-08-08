module.exports = {
  apps: [
    {
      name: "open-truly-chat",
      script: "index.js",
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production"
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};