const { connectDB, client } = require('./db');

async function registerUser(email, password) {
  const db = await connectDB();
  const users = db.collection('users');

  const existing = await users.findOne({ email });
  if (existing) {
    return { success: false, message: "User already exists" };
  }

  const result = await users.insertOne({ email, password });
  return { success: true, id: result.insertedId };
}

async function getAllUsers() {
  const db = await connectDB();
  const users = db.collection('users');
  return await users.find().toArray();
}

module.exports = {
  registerUser,
  getAllUsers,
};
