module.exports = {
  apps: [{
    name: "shopify-inventory-sync",

    script: "node",
    args: ["--env-file=.env", "./index.js"],

    cron_restart: "*/30 9-17 * * *",
    timezone: "Asia/Manila",

    watch: false,
    autorestart: false,

    env: {
      NODE_ENV: "production"
    },

    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    log_file: "./logs/pm2-combined.log",

    time: true,
    merge_logs: true
  }]
};
