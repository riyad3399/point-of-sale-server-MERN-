const mongoose = require("mongoose");
const globalUserSchema = require("../schemas/globalUserSchema");
const tenantSchema = require("../schemas/tenantSchema");

let globalConnection = null;
let GlobalUser = null;
let Tenant = null;

const getGlobalConnection = async () => {
  if (globalConnection && globalConnection.readyState === 1) {
    return globalConnection;
  }

  try {
    const globalDbName = process.env.GLOBAL_DB_NAME || "pos_global";
    const uri = `${process.env.MONGO_URI_BASE}/${globalDbName}${process.env.MONGO_URI_ENDPOINT}`;
    
    console.log("Connecting to global database:", globalDbName);

    globalConnection = await mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await new Promise((resolve, reject) => {
      globalConnection.once("connected", resolve);
      globalConnection.once("error", reject);
    });

    console.log("✅ Global database connected successfully");

    GlobalUser = globalConnection.model("GlobalUser", globalUserSchema);
    Tenant = globalConnection.model("Tenant", tenantSchema);

    globalConnection.on("error", (err) => {
      console.error("Global database connection error:", err);
    });

    globalConnection.on("disconnected", () => {
      console.log("Global database disconnected");
    });

    return globalConnection;
  } catch (error) {
    console.error("Failed to connect to global database:", error);
    throw error;
  }
};

const getGlobalModels = async () => {
  if (!globalConnection || globalConnection.readyState !== 1) {
    await getGlobalConnection();
  }

  return {
    GlobalUser,
    Tenant,
  };
};

const closeGlobalConnection = async () => {
  if (globalConnection) {
    await globalConnection.close();
    globalConnection = null;
    GlobalUser = null;
    Tenant = null;
    console.log("Global database connection closed");
  }
};

module.exports = {
  getGlobalConnection,
  getGlobalModels,
  closeGlobalConnection,
};