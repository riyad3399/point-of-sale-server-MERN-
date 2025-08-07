const axios = require("axios");

const BASE_URL = "http://localhost:3000";

async function testTenantIsolation() {
  console.log("🔒 Testing Tenant Data Isolation...\n");

  try {
    // Login as admin (master tenant)
    console.log("1️⃣ Logging in as super admin...");
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      userName: "admin",
      password: "Admin123!@#"
    });
    const adminToken = adminLogin.data.token;
    console.log("✅ Admin logged in - Tenant:", adminLogin.data.user.tenantId);

    // Login as demo user (demo tenant)
    console.log("\n2️⃣ Logging in as demo user...");
    const demoLogin = await axios.post(`${BASE_URL}/auth/login`, {
      userName: "demo",
      password: "Demo123!@#"
    });
    const demoToken = demoLogin.data.token;
    console.log("✅ Demo user logged in - Tenant:", demoLogin.data.user.tenantId);

    // Create category with admin
    console.log("\n3️⃣ Creating category with admin user...");
    const adminCategory = await axios.post(`${BASE_URL}/category`, {
      categoryName: "Admin Electronics",
      status: "Active"
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("✅ Admin category created");

    // Create category with demo user
    console.log("\n4️⃣ Creating category with demo user...");
    const demoCategory = await axios.post(`${BASE_URL}/category`, {
      categoryName: "Demo Books",
      status: "Active"
    }, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log("✅ Demo category created");

    // Get categories for admin
    console.log("\n5️⃣ Getting categories for admin...");
    const adminCategories = await axios.get(`${BASE_URL}/category`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log("✅ Admin categories count:", adminCategories.data.length || 0);

    // Get categories for demo
    console.log("\n6️⃣ Getting categories for demo user...");
    const demoCategories = await axios.get(`${BASE_URL}/category`, {
      headers: { Authorization: `Bearer ${demoToken}` }
    });
    console.log("✅ Demo categories count:", demoCategories.data.length || 0);

    // Verify isolation
    console.log("\n🔍 Verifying tenant isolation...");
    const adminData = adminCategories.data;
    const demoData = demoCategories.data;

    if (Array.isArray(adminData) && Array.isArray(demoData)) {
      const adminHasDemoCategory = adminData.some(cat => cat.categoryName === "Demo Books");
      const demoHasAdminCategory = demoData.some(cat => cat.categoryName === "Admin Electronics");

      if (!adminHasDemoCategory && !demoHasAdminCategory) {
        console.log("✅ TENANT ISOLATION VERIFIED - No cross-tenant data access");
      } else {
        console.log("❌ TENANT ISOLATION FAILED - Cross-tenant data detected");
      }
    } else {
      console.log("ℹ️ Could not verify isolation - data format differs");
    }

    console.log("\n🎉 Tenant isolation test completed!");

  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

testTenantIsolation();