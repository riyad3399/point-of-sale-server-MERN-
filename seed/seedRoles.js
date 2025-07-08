const Role = require("../schemas/roleSchema");

async function createDefaultRolesIfNotExist() {
  const count = await Role.countDocuments();
  if (count === 0) {
    await Role.create([
      {
        name: "admin",
        permissions: ["create_user", "edit_product", "view_reports", "delete_user"]
      },
      {
        name: "manager",
        permissions: ["edit_product", "view_reports"]
      },
      {
        name: "cashier",
        permissions: ["create_invoice", "view_invoice"]
      }
    ]);
    console.log("✅ Default roles created");
  } else {
    console.log("ℹ️ Roles already exist");
  }
}

// তারপর app.listen এর আগে call করো
createDefaultRolesIfNotExist();
