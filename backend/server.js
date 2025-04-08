const express = require('express');
const cors = require('cors');
const path = require('path');
const { registerUser, getAllUsers } = require('./register');
const { connectDB } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: ['https://g4mechanger.github.io'],
  methods: ['GET', 'POST'],
  credentials: false,
};
app.use(cors(corsOptions));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await registerUser(email, password);
    res.json(result);
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = await connectDB();
    const users = db.collection('users');
    const user = await users.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    res.json({ success: true, message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get("/", (req, res) => {
  res.send("BeeMazing backend is working!");
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
