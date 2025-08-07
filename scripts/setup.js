const { getGlobalConnection, getGlobalModels } = require("../db/globalConnection");
const { getTenantModels } = require("../model/tenantModels");
require("dotenv").config();

async function setupDatabase() {
  try {
    console.log("🔧 Setting up multi-tenant database...\n");

    // Initialize global connection
    console.log("📡 Connecting to global database...");
    await getGlobalConnection();
    console.log("✅ Global database connected\n");

    const { GlobalUser, Tenant } = await getGlobalModels();

    // Check if super admin exists
    const existingSuperAdmin = await GlobalUser.findOne({ isSuperAdmin: true });

    if (existingSuperAdmin) {
      console.log("👤 Super admin already exists:");
      console.log(`   Username: ${existingSuperAdmin.userName}`);
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Tenant ID: ${existingSuperAdmin.tenantId}\n`);
    } else {
      console.log("👤 Creating super admin user...");

      // Create master tenant
      const masterTenant = new Tenant({
        tenantId: "master",
        tenantName: "Master Organization",
        databaseName: "tenant_master",
        plan: "enterprise",
        subscription: {
          status: "active",
          startDate: new Date(),
        },
        isActive: true,
      });

      await masterTenant.save();
      console.log("✅ Master tenant created");

      // Create super admin user
      const superAdmin = new GlobalUser({
        userName: "admin",
        email: "admin@pos-system.com",
        password: "Admin123!@#",
        tenantId: "master",
        tenantDatabase: "tenant_master",
        isSuperAdmin: true,
        isActive: true,
        metadata: {
          firstName: "Super",
          lastName: "Admin",
        },
      });

      await superAdmin.save();
      console.log("✅ Super admin user created");

      // Setup tenant database with admin user
      const tenantModels = await getTenantModels("tenant_master");
      
      const tenantAdmin = new tenantModels.User({
        userName: "admin",
        password: "Admin123!@#",
        role: "developer",
        permissions: generateAllPermissions(),
      });

      await tenantAdmin.save();
      console.log("✅ Tenant admin user created\n");

      console.log("🎉 Setup completed successfully!");
      console.log("\n📋 Super Admin Credentials:");
      console.log("   Username: admin");
      console.log("   Password: Admin123!@#");
      console.log("   Email: admin@pos-system.com");
    }

    // Create test tenant and user
    const testTenant = await Tenant.findOne({ tenantId: "demo" });
    
    if (!testTenant) {
      console.log("\n👥 Creating demo tenant...");

      const demoTenant = new Tenant({
        tenantId: "demo",
        tenantName: "Demo Company",
        databaseName: "tenant_demo",
        plan: "trial",
        subscription: {
          status: "trial",
          startDate: new Date(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        isActive: true,
      });

      await demoTenant.save();
      console.log("✅ Demo tenant created");

      // Create demo user
      const demoUser = new GlobalUser({
        userName: "demo",
        email: "demo@company.com",
        password: "Demo123!@#",
        tenantId: "demo",
        tenantDatabase: "tenant_demo",
        isSuperAdmin: false,
        isActive: true,
        metadata: {
          firstName: "Demo",
          lastName: "User",
        },
      });

      await demoUser.save();
      console.log("✅ Demo user created");

      // Setup demo tenant database
      const demoTenantModels = await getTenantModels("tenant_demo");
      
      const demoTenantUser = new demoTenantModels.User({
        userName: "demo",
        password: "Demo123!@#",
        role: "manager",
        permissions: generateBasicPermissions(),
      });

      await demoTenantUser.save();
      console.log("✅ Demo tenant user created");

      console.log("\n📋 Demo User Credentials:");
      console.log("   Username: demo");
      console.log("   Password: Demo123!@#");
      console.log("   Email: demo@company.com");
      console.log("   Tenant ID: demo");
    } else {
      console.log("\n👥 Demo tenant already exists");
    }

    console.log("\n🔗 Database Structure:");
    console.log("   Global DB: pos_global");
    console.log("     Collections: globalusers, tenants");
    console.log("   Master Tenant DB: tenant_master");
    console.log("   Demo Tenant DB: tenant_demo");
    console.log("     Collections: users, products, customers, etc.");

    console.log("\n🚀 System is ready for use!");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
  } finally {
    process.exit();
  }
}

function generateAllPermissions() {
  const crudPermission = {
    trigger: true,
    view: true,
    add: true,
    edit: true,
    delete: true,
  };

  return {
    sales: {
      trigger: true,
      retailSale: { ...crudPermission },
      wholeSale: { ...crudPermission },
      transactions: { ...crudPermission },
      quotations: { ...crudPermission },
    },
    inventory: {
      trigger: true,
      categories: { ...crudPermission },
      products: { ...crudPermission },
      alertItems: { ...crudPermission },
    },
    purchase: {
      trigger: true,
      purchase: { ...crudPermission },
    },
    customers: {
      trigger: true,
      customers: { ...crudPermission },
    },
    supplier: {
      trigger: true,
      supplier: { ...crudPermission },
    },
    expense: {
      trigger: true,
      expense: { ...crudPermission },
    },
    accounts: {
      trigger: true,
      accounts: { ...crudPermission },
    },
    employee: {
      trigger: true,
      employee: { ...crudPermission },
    },
    report: {
      trigger: true,
      report: { ...crudPermission },
    },
    settings: {
      trigger: true,
      settings: { ...crudPermission },
    },
    usersAndPermission: {
      trigger: true,
      userManagement: { ...crudPermission },
    },
  };
}

function generateBasicPermissions() {
  const basicPermission = {
    trigger: true,
    view: true,
    add: true,
    edit: false,
    delete: false,
  };

  return {
    sales: {
      trigger: true,
      retailSale: { ...basicPermission, edit: true },
      wholeSale: { ...basicPermission },
      transactions: { trigger: true, view: true, add: false, edit: false, delete: false },
      quotations: { ...basicPermission },
    },
    inventory: {
      trigger: true,
      categories: { ...basicPermission },
      products: { ...basicPermission, edit: true },
      alertItems: { trigger: true, view: true, add: false, edit: false, delete: false },
    },
    customers: {
      trigger: true,
      customers: { ...basicPermission, edit: true },
    },
    supplier: {
      trigger: true,
      supplier: { ...basicPermission },
    },
    expense: {
      trigger: true,
      expense: { ...basicPermission },
    },
    settings: {
      trigger: false,
      settings: { trigger: false, view: false, add: false, edit: false, delete: false },
    },
    usersAndPermission: {
      trigger: false,
      userManagement: { trigger: false, view: false, add: false, edit: false, delete: false },
    },
  };
}

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };