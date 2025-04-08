// backend/db.js
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://g4mechanger888:wearewe12@beemazing.mniyzbt.mongodb.net/?retryWrites=true&w=majority&appName=BeeMazing";
const client = new MongoClient(uri);

async function connectDB() {
  await client.connect();
  return client.db("BeeMazingDB");
}

module.exports = { connectDB, client };
