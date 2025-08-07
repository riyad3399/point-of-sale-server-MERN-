const mongoose = require("mongoose");

const connections = {};

const getTenantConnection = async (tenantDatabase) => {
  const dbName = tenantDatabase;
  const uri = `${process.env.MONGO_URI_BASE}/${dbName}${process.env.MONGO_URI_ENDPOINT}`;

  if (connections[dbName]) {
    if (connections[dbName].readyState === 1) {
      return connections[dbName];
    } else {
      delete connections[dbName];
    }
  }

  try {
    console.log("Connecting to tenant database:", dbName);

    const connection = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await new Promise((resolve, reject) => {
      connection.once("connected", resolve);
      connection.once("error", reject);
    });

    console.log(`✅ Tenant database connected: ${dbName}`);

    connections[dbName] = connection;

    connection.on("error", (err) => {
      console.error(`Tenant database error (${dbName}):`, err);
    });

    connection.on("disconnected", () => {
      console.log(`Tenant database disconnected: ${dbName}`);
      delete connections[dbName];
    });

    return connection;
  } catch (error) {
    console.error(`Failed to connect to tenant database ${dbName}:`, error);
    throw error;
  }
};

const closeTenantConnection = async (tenantDatabase) => {
  if (connections[tenantDatabase]) {
    await connections[tenantDatabase].close();
    delete connections[tenantDatabase];
    console.log(`Tenant database connection closed: ${tenantDatabase}`);
  }
};

const closeAllTenantConnections = async () => {
  const promises = Object.keys(connections).map((dbName) =>
    closeTenantConnection(dbName)
  );
  await Promise.all(promises);
  console.log("All tenant database connections closed");
};

module.exports = {
  getTenantConnection,
  closeTenantConnection,
  closeAllTenantConnections,
};
