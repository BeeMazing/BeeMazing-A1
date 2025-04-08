// backend/db.js
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://g4mechanger888:wearewe12@beemazing.mniyzbt.mongodb.net/?retryWrites=true&w=majority&appName=BeeMazing";

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  tls: true, // ✅ Ensure TLS is used
  tlsAllowInvalidCertificates: false, // ✅ Validate certificates (set to true only for testing)
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function connectDB() {
  await client.connect();
  return client.db("BeeMazingDB");
}

module.exports = { connectDB, client };
