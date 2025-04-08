// backend/register.js
const { connectDB, client } = require('./db');

async function registerUser(email, password) {
  const db = await connectDB();
  const users = db.collection('users');

  const existing = await users.findOne({ email });
  if (existing) {
    return { success: false, message: "User already exists" };
  }

  const result = await users.insertOne({ email, password });
  await client.close();
  return { success: true, id: result.insertedId };
}

async function getAllUsers() {
  const db = await connectDB();
  const users = db.collection('users');

  const allUsers = await users.find().toArray();
  await client.close();
  return allUsers;
}

module.exports = {
  registerUser,
  getAllUsers
};