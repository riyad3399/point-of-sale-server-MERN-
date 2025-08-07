#!/usr/bin/env node

// scripts/rollback-migration.js - Rollback from production server

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

async function rollbackMigration() {
  console.log("🔄 Production Server Rollback Tool\n");
  console.log("This tool will rollback to your previous server configuration.\n");

  try {
    const serverPath = path.join(__dirname, "..", "server.js");
    const backupPath = path.join(__dirname, "..", "server-backup.js");

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      console.error("❌ Error: No backup found (server-backup.js)!");
      console.log("Cannot rollback without a backup file.\n");
      process.exit(1);
    }

    // Ask for confirmation
    console.log("⚠️  This will replace the current server.js with the backup version.\n");
    const answer = await question("Do you want to proceed with the rollback? (yes/no): ");

    if (answer.toLowerCase() !== "yes") {
      console.log("\n❌ Rollback cancelled.");
      rl.close();
      return;
    }

    // Perform rollback
    console.log("\nPerforming rollback...");
    
    // Backup the current production server
    const productionBackupPath = path.join(__dirname, "..", "server-production-current.js");
    fs.copyFileSync(serverPath, productionBackupPath);
    console.log("✅ Current production server backed up to: server-production-current.js");

    // Restore from backup
    fs.copyFileSync(backupPath, serverPath);
    console.log("✅ Server rolled back successfully!");

    console.log("\n📋 Post-Rollback Notes:");
    console.log("- The production server has been saved as server-production-current.js");
    console.log("- You can now start the server normally: npm start");
    console.log("- To re-apply production server: npm run migrate:production\n");

  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
  } finally {
    rl.close();
  }
}

// Run rollback
if (require.main === module) {
  rollbackMigration();
}

module.exports = { rollbackMigration };