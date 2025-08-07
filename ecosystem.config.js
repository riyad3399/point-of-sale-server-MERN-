// ecosystem.config.js - PM2 Configuration for Production

module.exports = {
  apps: [
    {
      name: "pos-server",
      script: "./server.js",
      instances: "max", // Use all available CPU cores
      exec_mode: "cluster", // Enable cluster mode for load balancing
      
      // Environment variables
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      
      // Logging
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Advanced features
      watch: false, // Don't watch files in production
      ignore_watch: ["node_modules", "logs", "uploads", ".git"],
      max_memory_restart: "1G", // Restart if memory usage exceeds 1GB
      
      // Crash handling
      min_uptime: "10s", // Minimum uptime to consider app started
      max_restarts: 10, // Maximum restarts within min_uptime
      autorestart: true, // Auto restart on crash
      
      // Graceful shutdown
      kill_timeout: 5000, // Time to wait before forcefully killing the process
      wait_ready: true, // Wait for process.send('ready')
      listen_timeout: 3000, // Time to wait for app to listen
      
      // Performance
      node_args: "--max-old-space-size=2048", // Increase memory limit to 2GB
      
      // Monitoring
      instance_var: "INSTANCE_ID", // Instance variable name
      merge_logs: true, // Merge logs from all instances
      
      // Auto-restart cron (optional - restart daily at 3 AM)
      // cron_restart: "0 3 * * *",
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: "deploy", // SSH user
      host: ["your-server-ip"], // Server IP or hostname
      ref: "origin/master", // Git branch
      repo: "git@github.com:yourusername/your-repo.git", // Git repository
      path: "/var/www/pos-server", // Deployment path
      "pre-deploy": "git pull",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "mkdir -p /var/www/pos-server",
      ssh_options: "StrictHostKeyChecking=no",
      env: {
        NODE_ENV: "production",
      },
    },
    
    staging: {
      user: "deploy",
      host: ["staging-server-ip"],
      ref: "origin/develop",
      repo: "git@github.com:yourusername/your-repo.git",
      path: "/var/www/pos-server-staging",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env staging",
      env: {
        NODE_ENV: "staging",
      },
    },
  },
};