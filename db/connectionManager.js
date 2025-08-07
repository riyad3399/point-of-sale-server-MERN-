// // db/connectionManager.js
// const mongoose = require("mongoose");

// const connections = {};

// const getTenantConnection = async (tenantId) => {
//   const dbName = `tenant_${tenantId}`; // ডাটাবেইজ নাম
//   const uri = `${process.env.MONGO_URI_BASE}/${dbName}${process.env.MONGO_URI_ENDPOINT}`;
//   // const uri = `mongodb://127.0.0.1:27017/${dbName}`;

//   if (connections[tenantId]) {
//     return connections[tenantId];
//   }

//   const connection = await mongoose.createConnection(uri);

//   // Wait for the connection to be established
//   await new Promise((resolve, reject) => {
//     connection.once("connected", resolve);
//     connection.once("error", reject);
//   });

//   connections[tenantId] = connection;
//   return connection;
// };

// module.exports = { getTenantConnection };

const mongoose = require("mongoose");

const connections = {};

const getTenantConnection = async (tenantId) => {
  const dbName = `tenant_${tenantId}`; // যেমন: tenant_institute1
  const uri = `${process.env.MONGO_URI_BASE}/${dbName}${process.env.MONGO_URI_ENDPOINT}`;

  // Cache এর জন্য সঠিক key use করো (dbName)
  if (connections[dbName]) {
    return connections[dbName];
  }

  console.log("Mongo URI to connect:", uri);

  const connection = await mongoose.createConnection(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await new Promise((resolve, reject) => {
    connection.once("connected", resolve);
    connection.once("error", reject);
  });

  connections[dbName] = connection;
  return connection;
};

module.exports = { getTenantConnection };
