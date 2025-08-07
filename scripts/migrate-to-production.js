#!/usr/bin/env node

// scripts/migrate-to-production.js - Safe migration to production server

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function migrateToProduction() {
  console.log("🚀 Production Server Migration Tool\n");
  console.log("This tool will help you safely migrate to the production server.\n");

  try {
    // Step 1: Backup current server.js
    console.log("Step 1: Backing up current server.js...");
    const serverPath = path.join(__dirname, "..", "server.js");
    const backupPath = path.join(__dirname, "..", "server-backup.js");
    const productionPath = path.join(__dirname, "..", "server-production.js");

    if (fs.existsSync(serverPath)) {
      fs.copyFileSync(serverPath, backupPath);
      console.log("✅ Backup created: server-backup.js\n");
    }

    // Step 2: Check if production server exists
    if (!fs.existsSync(productionPath)) {
      console.error("❌ Error: server-production.js not found!");
      console.log("Please ensure server-production.js exists before migration.\n");
      process.exit(1);
    }

    // Step 3: Create logs directory
    console.log("Step 2: Creating logs directory...");
    const logsDir = path.join(__dirname, "..", "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log("✅ Logs directory created\n");
    } else {
      console.log("✅ Logs directory already exists\n");
    }

    // Step 4: Check environment variables
    console.log("Step 3: Checking environment configuration...");
    const envPath = path.join(__dirname, "..", ".env");
    
    if (!fs.existsSync(envPath)) {
      console.error("❌ Warning: .env file not found!");
      console.log("Please create .env file with required configuration.\n");
    } else {
      console.log("✅ Environment file found\n");
    }

    // Step 5: Update package.json scripts
    console.log("Step 4: Updating package.json scripts...");
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    // Add production scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "start:production": "NODE_ENV=production node server.js",
      "start:dev": "NODE_ENV=development nodemon server.js",
      "start:backup": "node server-backup.js",
      "migrate:production": "node scripts/migrate-to-production.js",
      "migrate:rollback": "node scripts/rollback-migration.js",
    };

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log("✅ Package.json updated with production scripts\n");

    // Step 6: Create environment template
    console.log("Step 5: Creating production environment template...");
    const envTemplate = `# Production Environment Configuration
NODE_ENV=production
PORT=3000

# MongoDB Configuration
MONGO_URI_BASE=mongodb+srv://username:password@cluster.mongodb.net
MONGO_URI_ENDPOINT=?retryWrites=true&w=majority&appName=Cluster0
GLOBAL_DB_NAME=pos_global

# Security
SECRET_KEY=${generateSecureKey()}
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# CORS (comma-separated origins)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# SMS Service (Optional)
BULKSMS_API=your_api_key
BULKSMS_SENDER=your_sender_id
`;

    const envProdPath = path.join(__dirname, "..", ".env.production.example");
    fs.writeFileSync(envProdPath, envTemplate);
    console.log("✅ Production environment template created: .env.production.example\n");

    // Step 7: Ask for confirmation
    console.log("⚠️  IMPORTANT: This will replace your current server.js with the production version.\n");
    const answer = await question("Do you want to proceed with the migration? (yes/no): ");

    if (answer.toLowerCase() !== "yes") {
      console.log("\n❌ Migration cancelled.");
      rl.close();
      return;
    }

    // Step 8: Perform migration
    console.log("\nStep 6: Migrating to production server...");
    fs.copyFileSync(productionPath, serverPath);
    console.log("✅ Production server deployed successfully!\n");

    // Step 9: Display post-migration instructions
    console.log("📋 Post-Migration Checklist:\n");
    console.log("1. Update .env file with production values");
    console.log("2. Set NODE_ENV=production in your environment");
    console.log("3. Install PM2 for process management: npm install -g pm2");
    console.log("4. Configure firewall rules for your server");
    console.log("5. Set up SSL/TLS certificates");
    console.log("6. Configure backup strategy");
    console.log("7. Set up monitoring and alerting\n");

    console.log("🎉 Migration completed successfully!\n");
    console.log("To start the production server:");
    console.log("  npm run start:production\n");
    console.log("To rollback if needed:");
    console.log("  npm run migrate:rollback\n");

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.log("\nPlease fix the error and try again.");
  } finally {
    rl.close();
  }
}

function generateSecureKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
  let key = "";
  for (let i = 0; i < 64; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Run migration
if (require.main === module) {
  migrateToProduction();
}

module.exports = { migrateToProduction };