module.exports = {
  apps: [
    {
      name: "novexa-news",
      cwd: "/var/www/newswebsite",
      script: ".next/standalone/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: 3000
      }
    }
  ]
};
