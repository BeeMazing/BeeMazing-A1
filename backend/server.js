// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { registerUser, getAllUsers } = require('./register');
const { connectDB } = require('./db'); // ✅ Don't forget this

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. Serve static files (e.g., mobile folder HTML)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Registration endpoint
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const result = await registerUser(email, password);
  res.json(result);
});

// 3. Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await connectDB();
  const users = db.collection('users');

  const user = await users.findOne({ email });

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  res.json({ success: true, message: "Login successful" });
});

// 4. Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
