const bcrypt = require('bcryptjs'); // Changed to bcryptjs
const { connectDB } = require('./db');

async function registerUser(email, password) {
  const db = await connectDB();
  const users = db.collection('users');

  const existing = await users.findOne({ email });
  if (existing) {
    return { success: false, message: "User already exists" };
  }

  // Hash the password before storing
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await users.insertOne({ email, password: hashedPassword });
  return { success: true, id: result.insertedId };
}

async function getAllUsers() {
  const db = await connectDB();
  const users = db.collection('users');

  const allUsers = await users.find().toArray();
  return allUsers;
}

module.exports = {
  registerUser,
  getAllUsers
};