// routes/monitoring.js - Production Monitoring Endpoints

const express = require("express");
const router = express.Router();
const os = require("os");
const { getGlobalModels } = require("../db/globalConnection");

// Basic health check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Detailed health check (protected)
router.get("/health/detailed", async (req, res) => {
  try {
    // Check database connection
    const { GlobalUser, Tenant } = await getGlobalModels();
    const dbStatus = await GlobalUser.db.admin().ping();

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: process.memoryUsage(),
        },
        cpu: {
          cores: os.cpus().length,
          model: os.cpus()[0].model,
          loadAverage: os.loadavg(),
        },
        node: {
          version: process.version,
          env: process.env.NODE_ENV,
        },
      },
      database: {
        status: dbStatus ? "connected" : "disconnected",
        latency: null, // Will be calculated
      },
    };

    // Measure database latency
    const startTime = Date.now();
    await Tenant.findOne().limit(1);
    health.database.latency = Date.now() - startTime;

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Readiness check (for load balancers)
router.get("/ready", async (req, res) => {
  try {
    // Check if database is accessible
    const { GlobalUser } = await getGlobalModels();
    await GlobalUser.db.admin().ping();
    
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: "Service not ready",
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness check (for container orchestration)
router.get("/live", (req, res) => {
  res.status(200).json({
    live: true,
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint (for monitoring tools)
router.get("/metrics", async (req, res) => {
  try {
    const { GlobalUser, Tenant } = await getGlobalModels();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
      system: {
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length,
      },
      application: {
        tenants: await Tenant.countDocuments(),
        users: await GlobalUser.countDocuments(),
        activeTenants: await Tenant.countDocuments({ isActive: true }),
        activeUsers: await GlobalUser.countDocuments({ isActive: true }),
      },
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: "Failed to collect metrics",
      message: error.message,
    });
  }
});

module.exports = router;