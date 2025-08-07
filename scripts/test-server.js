const express = require("express");
const cors = require("cors");

// Mock server for testing without MongoDB
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mock data
let mockTenants = [
  {
    tenantId: "demo",
    tenantName: "Demo Company",
    databaseName: "tenant_demo",
    isActive: true,
  }
];

let mockUsers = [
  {
    _id: "mock-user-id",
    userName: "admin",
    email: "admin@pos-system.com",
    tenantId: "master",
    tenantDatabase: "tenant_master",
    isSuperAdmin: true,
    isActive: true,
  },
  {
    _id: "mock-demo-id",
    userName: "demo",
    email: "demo@company.com",
    tenantId: "demo",
    tenantDatabase: "tenant_demo",
    isSuperAdmin: false,
    isActive: true,
  }
];

// Mock JWT generation
const generateMockToken = (user) => {
  return `mock-jwt-token-${user._id}`;
};

// Health endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Mock server is running",
    timestamp: new Date().toISOString(),
    mode: "testing"
  });
});

// Mock auth endpoints
app.post("/auth/login", (req, res) => {
  const { userName, password } = req.body;
  
  const user = mockUsers.find(u => u.userName === userName);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  // Mock password validation (accept any password for testing)
  const validPasswords = ["Admin123!@#", "Demo123!@#"];
  if (!validPasswords.some(p => p === password)) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials"
    });
  }

  res.json({
    success: true,
    message: "Login successful",
    token: generateMockToken(user),
    user: {
      id: user._id,
      userName: user.userName,
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      role: "admin"
    }
  });
});

app.post("/auth/register", (req, res) => {
  const { userName, email, tenantName } = req.body;
  
  // Check if user exists
  if (mockUsers.find(u => u.userName === userName || u.email === email)) {
    return res.status(400).json({
      success: false,
      message: "User already exists"
    });
  }

  const newTenantId = tenantName.toLowerCase().replace(/\s+/g, "_");
  const newUser = {
    _id: `mock-user-${Date.now()}`,
    userName,
    email,
    tenantId: newTenantId,
    tenantDatabase: `tenant_${newTenantId}`,
    isSuperAdmin: false,
    isActive: true,
  };

  mockUsers.push(newUser);

  const newTenant = {
    tenantId: newTenantId,
    tenantName,
    databaseName: `tenant_${newTenantId}`,
    isActive: true,
  };

  mockTenants.push(newTenant);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    token: generateMockToken(newUser),
    user: {
      id: newUser._id,
      userName: newUser.userName,
      email: newUser.email,
      tenantId: newUser.tenantId,
      isSuperAdmin: newUser.isSuperAdmin,
      role: "admin"
    },
    tenant: {
      tenantId: newTenant.tenantId,
      tenantName: newTenant.tenantName,
    }
  });
});

app.get("/auth/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  
  if (!token || !token.startsWith("mock-jwt-token")) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }

  // Extract user ID from mock token
  const userId = token.replace("mock-jwt-token-", "");
  const user = mockUsers.find(u => u._id === userId);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found"
    });
  }

  res.json({
    success: true,
    user: {
      id: user._id,
      userName: user.userName,
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      role: "admin"
    }
  });
});

// Mock admin endpoints
app.get("/admin/tenants", (req, res) => {
  res.json({
    success: true,
    count: mockTenants.length,
    tenants: mockTenants
  });
});

app.get("/admin/stats", (req, res) => {
  res.json({
    success: true,
    stats: {
      totalTenants: mockTenants.length,
      activeTenants: mockTenants.filter(t => t.isActive).length,
      totalUsers: mockUsers.length,
      activeUsers: mockUsers.filter(u => u.isActive).length,
    }
  });
});

// Mock tenant endpoints
app.get("/product", (req, res) => {
  res.json({
    success: true,
    message: "Products endpoint accessible",
    data: [],
    tenant: "mock-tenant"
  });
});

app.get("/category", (req, res) => {
  res.json({
    success: true,
    message: "Categories endpoint accessible", 
    data: [],
    tenant: "mock-tenant"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found in mock server`
  });
});

app.listen(PORT, () => {
  console.log(`🧪 Mock test server running on http://localhost:${PORT}`);
  console.log(`📝 Available test credentials:`);
  console.log(`   Super Admin - Username: admin, Password: Admin123!@#`);
  console.log(`   Demo User - Username: demo, Password: Demo123!@#`);
  console.log(`🔧 Use this server for testing the multi-tenant API structure`);
});

module.exports = app;