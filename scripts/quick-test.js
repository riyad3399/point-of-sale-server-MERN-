const axios = require("axios");

const BASE_URL = process.env.BACKEND_URL || process.env.TEST_URL || "http://localhost:3000";

async function quickTest() {
  console.log("🧪 Quick API Test...\n");

  try {
    // Test 1: Health Check
    console.log("1️⃣ Testing health endpoint...");
    const health = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Health:", health.data.message);

    // Test 2: Login with super admin
    console.log("\n2️⃣ Testing super admin login...");
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      userName: "admin",
      password: "Admin123!@#"
    });
    console.log("✅ Super admin login successful");
    console.log("   Token:", adminLogin.data.token ? "✅ Received" : "❌ Missing");
    
    const adminToken = adminLogin.data.token;

    // Test 3: Get user info
    console.log("\n3️⃣ Testing authenticated request...");
    const userInfo = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("✅ User info retrieved");
    console.log("   Username:", userInfo.data.user.userName);
    console.log("   Super Admin:", userInfo.data.user.isSuperAdmin);
    console.log("   Tenant:", userInfo.data.user.tenantId);

    // Test 4: Demo user login
    console.log("\n4️⃣ Testing demo user login...");
    const demoLogin = await axios.post(`${BASE_URL}/auth/login`, {
      userName: "demo",
      password: "Demo123!@#"
    });
    console.log("✅ Demo user login successful");
    console.log("   Tenant:", demoLogin.data.user.tenantId);
    
    const demoToken = demoLogin.data.token;

    // Test 5: Tenant-specific endpoint
    console.log("\n5️⃣ Testing tenant-specific endpoint (categories)...");
    const categories = await axios.get(`${BASE_URL}/category`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log("✅ Categories endpoint accessible");
    console.log("   Status:", categories.status);

    // Test 6: Admin endpoint
    console.log("\n6️⃣ Testing admin endpoint...");
    const adminStats = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("✅ Admin stats retrieved");
    console.log("   Total Tenants:", adminStats.data.stats.totalTenants);
    console.log("   Total Users:", adminStats.data.stats.totalUsers);

    // Test 7: New tenant registration
    console.log("\n7️⃣ Testing new tenant registration...");
    try {
      const newTenant = await axios.post(`${BASE_URL}/auth/register`, {
        userName: "testcompany",
        email: "admin@testcompany.com",
        password: "Test123!@#",
        tenantName: "Test Company",
        firstName: "Test",
        lastName: "Admin"
      });
      console.log("✅ New tenant registration successful");
      console.log("   New Tenant ID:", newTenant.data.user.tenantId);
    } catch (error) {
      if (error.response?.data?.message?.includes("already exists")) {
        console.log("ℹ️ Test tenant already exists (expected)");
      } else {
        console.log("❌ Registration failed:", error.response?.data?.message);
      }
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📋 Working Credentials:");
    console.log("Super Admin - Username: admin, Password: Admin123!@#");
    console.log("Demo User - Username: demo, Password: Demo123!@#");

  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

quickTest();