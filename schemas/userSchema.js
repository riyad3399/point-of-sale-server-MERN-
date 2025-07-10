const mongoose = require("mongoose");

const crudPermissionSchema = new mongoose.Schema(
  {
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const permissionSchema = new mongoose.Schema(
  {
    sales: {
      trigger: { type: Boolean, default: false },
      retailSale: crudPermissionSchema,
      wholeSale: crudPermissionSchema,
      transactions: crudPermissionSchema,
      quotations: crudPermissionSchema,
    },
    inventory: {
      trigger: { type: Boolean, default: false },
      categories: crudPermissionSchema,
      products: crudPermissionSchema,
      alertItems: crudPermissionSchema,
    },
    purchase: {
      trigger: { type: Boolean, default: false },
      purchase: crudPermissionSchema,
    },
    customers: {
      trigger: { type: Boolean, default: false },
      customers: crudPermissionSchema,
    },
    supplier: {
      trigger: { type: Boolean, default: false },
      supplier: crudPermissionSchema,
    },
    expense: {
      trigger: { type: Boolean, default: false },
      expense: crudPermissionSchema,
    },
    accounts: {
      trigger: { type: Boolean, default: false },
      accounts: crudPermissionSchema,
    },
    employee: {
      trigger: { type: Boolean, default: false },
      employee: crudPermissionSchema,
    },
    report: {
      trigger: { type: Boolean, default: false },
      report: crudPermissionSchema,
    },
    settings: {
      trigger: { type: Boolean, default: false },
      settings: crudPermissionSchema,
    },
    usersAndPermission: {
      trigger: { type: Boolean, default: false },
      userManagement: crudPermissionSchema,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  designation: {
    type: String,
    required: false,
  },

  role: {
    type: String,
    required: true, // example: "admin", "developer", etc.
  },

  permissions: permissionSchema,

  createdOn: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
