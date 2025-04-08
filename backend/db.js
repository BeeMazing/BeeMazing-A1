const { MongoClient, ServerApiVersion } = require('mongodb');

// Use environment variable for MongoDB URI, fallback to hardcoded value for local testing
const uri = process.env.MONGODB_URI || "mongodb+srv://g4mechanger888:wearewe12@beemazing.mniyzbt.mongodb.net/?retryWrites=true&w=majority&appName=BeeMazing";

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
  connectTimeoutMS: 10000, // 10 seconds timeout
  serverSelectionTimeoutMS: 10000 // 10 seconds timeout for server selection
});

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    return client.db("BeeMazingDB");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err);
    throw err;
  }
}

module.exports = { connectDB, client };