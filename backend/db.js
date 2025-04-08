// backend/db.js
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://g4mechanger888:pass123@beemazing.mniyzbt.mongodb.net/?retryWrites=true&w=majority&appName=BeeMazing";

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  tls: true,
  tlsAllowInvalidCertificates: false, // Make sure certs are required and verified
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function connectDB() {
  await client.connect();
  return client.db("BeeMazingDB");
}

module.exports = { connectDB, client };
