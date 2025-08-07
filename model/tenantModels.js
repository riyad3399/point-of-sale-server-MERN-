const { getTenantConnection } = require("../db/connectionManager");

// Import schemas from your schemas folder
const categorySchema = require("../schemas/categorySchema");
const userSchema = require("../schemas/userSchema");

const getTenantModels = async (tenantId) => {
  const connection = await getTenantConnection(tenantId);

  console.log('Connection Status:', {
    isConnected: connection.readyState === 1,
    state: connection.readyState,
    name: connection.name,
    host: connection.host,
    port: connection.port
  });

  const Category =
    connection.models.Category || connection.model("Category", categorySchema);
  const User =
    connection.models.User || connection.model("User", userSchema);

  return { Category, User };
};

module.exports = { getTenantModels };
