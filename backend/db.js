// backend/db.js
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://g4mechanger888:wearewe12@beemazing.mniyzbt.mongodb.net/?retryWrites=true&w=majority&appName=BeeMazing";

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  ssl: true,
  tlsAllowInvalidCertificates: false, // Enforce valid SSL cert
});

async function connectDB() {
  await client.connect();
  return client.db("BeeMazingDB");
}

module.exports = { connectDB, client };
