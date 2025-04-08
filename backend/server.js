const express = require('express');
const cors = require('cors');
const path = require('path');
const { registerUser, getAllUsers } = require('./register');
const { connectDB } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// ✅ CORS for GitHub Pages
const corsOptions = {
  origin: ['https://g4mechanger.github.io'],
  methods: ['GET', 'POST'],
  credentials: false
};
app.use(cors(corsOptions)); // ✅ only once, with correct options!

app.use(express.json());

// ✅ Serve frontend files if any (optional)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ API routes
app.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await registerUser(email, password);
      res.json(result);
    } catch (err) {
      console.error("🔥 Error in /register:", err);
      res.status(500).json({ success: false, message: "Server error during registration" });
    }
  });

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

app.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ✅ Health check
app.get("/", (req, res) => {
  res.send("BeeMazing backend is working!");
});

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
