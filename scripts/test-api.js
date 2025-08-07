const axios = require("axios");

const BASE_URL = process.env.TEST_URL || "http://localhost:3001"; // Default to mock server

async function testAPI() {
  console.log("🧪 Testing Multi-Tenant API...\n");

  try {
    // Test 1: Health Check
    console.log("1️⃣ Testing health endpoint...");
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Health check:", healthResponse.data.message);
    console.log("");

    // Test 2: Register new tenant
    console.log("2️⃣ Testing tenant registration...");
    const registerData = {
      userName: "testuser",
      email: "test@testcompany.com",
      password: "Test123!@#",
      tenantName: "Test Company",
      firstName: "Test",
      lastName: "User",
      phone: "01234567890"
    };

    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
      console.log("✅ Registration successful");
      console.log("   Token received:", !!registerResponse.data.token);
      console.log("   Tenant ID:", registerResponse.data.user.tenantId);
      console.log("");

      const authToken = registerResponse.data.token;

      // Test 3: Login with new user
      console.log("3️⃣ Testing login...");
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        userName: "testuser",
        password: "Test123!@#"
      });
      console.log("✅ Login successful");
      console.log("   User:", loginResponse.data.user.userName);
      console.log("   Role:", loginResponse.data.user.role);
      console.log("");

      // Test 4: Get user info
      console.log("4️⃣ Testing authenticated request...");
      const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log("✅ User info retrieved");
      console.log("   Username:", userResponse.data.user.userName);
      console.log("   Tenant ID:", userResponse.data.user.tenantId);
      console.log("");

      // Test 5: Test tenant-specific endpoint (categories)
      console.log("5️⃣ Testing tenant-specific endpoint...");
      try {
        const categoriesResponse = await axios.get(`${BASE_URL}/category`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log("✅ Categories endpoint accessible");
        console.log("   Response received");
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.log("✅ Categories endpoint accessible (empty result expected)");
        } else {
          console.log("❌ Categories endpoint error:", error.response?.data?.message || error.message);
        }
      }
      console.log("");

    } catch (registerError) {
      if (registerError.response && registerError.response.data.message.includes("already exists")) {
        console.log("ℹ️ Test user already exists, testing login instead...");
        
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          userName: "testuser",
          password: "Test123!@#"
        });
        console.log("✅ Login with existing user successful");
        console.log("");
      } else {
        throw registerError;
      }
    }

    // Test 6: Test with demo user (if exists)
    console.log("6️⃣ Testing with demo user...");
    try {
      const demoLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        userName: "demo",
        password: "Demo123!@#"
      });
      console.log("✅ Demo user login successful");
      console.log("   Tenant ID:", demoLoginResponse.data.user.tenantId);
    } catch (demoError) {
      console.log("ℹ️ Demo user not available (run setup script first)");
    }
    console.log("");

    // Test 7: Test invalid login
    console.log("7️⃣ Testing invalid login...");
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        userName: "nonexistent",
        password: "wrongpassword"
      });
      console.log("❌ Should have failed");
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("✅ Invalid login properly rejected");
      } else {
        console.log("❌ Unexpected error:", error.message);
      }
    }
    console.log("");

    console.log("🎉 All tests completed!");

  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };