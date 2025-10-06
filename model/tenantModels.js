const { getTenantConnection } = require("../db/connectionManager");
const categorySchema = require("../schemas/categorySchema");
const userSchema = require("../schemas/userSchema");
const productSchema = require("../schemas/productSchema");
const customerSchema = require("../schemas/customerSchema");
const supplierSchema = require("../schemas/supplierSchem");
const invoiceSchema = require("../schemas/invoiceSchema");
const quotationSchema = require("../schemas/quotationSchema");
const expenseSchema = require("../schemas/expenseSchema");
const purchaseSchema = require("../schemas/purchaseSchema");
const purchaseStockSchema = require("../schemas/purchaseStockSchema");
const counterSchema = require("../schemas/counterSchema");
const roleSchema = require("../schemas/roleSchema");
const storeSettingSchema = require("../schemas/storeSettingSchema");
const purchaseReturnSchema = require("../schemas/PurchaseReturnSchema");
const modelCache = {};

const getTenantModels = async (tenantDatabase) => {
  if (modelCache[tenantDatabase]) {
    const connection = modelCache[tenantDatabase].connection;
    if (connection.readyState === 1) {
      return modelCache[tenantDatabase].models;
    } else {
      delete modelCache[tenantDatabase];
    }
  }

  const connection = await getTenantConnection(tenantDatabase);

  const models = {
    Category:
      connection.models.Category ||
      connection.model("Category", categorySchema),
    User: connection.models.User || connection.model("User", userSchema),
    Product:
      connection.models.Product || connection.model("Product", productSchema),
    Customer:
      connection.models.Customer ||
      connection.model("Customer", customerSchema),
    Supplier:
      connection.models.Supplier ||
      connection.model("Supplier", supplierSchema),
    Invoice:
      connection.models.Invoice || connection.model("Invoice", invoiceSchema),
    Quotation:
      connection.models.Quotation ||
      connection.model("Quotation", quotationSchema),
    Expense:
      connection.models.Expense || connection.model("Expense", expenseSchema),
    Purchase:
      connection.models.Purchase ||
      connection.model("Purchase", purchaseSchema),
    PurchaseReturn:
      connection.models.PurchaseReturn ||
      connection.model("PurchaseReturn", purchaseReturnSchema),
    PurchaseStock:
      connection.models.PurchaseStock ||
      connection.model("PurchaseStock", purchaseStockSchema),
    Counter:
      connection.models.Counter || connection.model("Counter", counterSchema),
    Role: connection.models.Role || connection.model("Role", roleSchema),
    Setting:
      connection.models.Setting ||
      connection.model("Setting", storeSettingSchema),
  };

  modelCache[tenantDatabase] = {
    connection,
    models,
  };

  return models;
};

const clearModelCache = (tenantDatabase) => {
  if (tenantDatabase) {
    delete modelCache[tenantDatabase];
  } else {
    Object.keys(modelCache).forEach((key) => delete modelCache[key]);
  }
};

module.exports = {
  getTenantModels,
  clearModelCache,
};
