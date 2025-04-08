const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs'); // Changed to bcryptjs
const { registerUser, getAllUsers } = require('./register');
const { connectDB } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB before starting the server
let db;
connectDB()
  .then(database => {
    db = database;
    console.log("✅ MongoDB connected, starting server...");
    startServer();
  })
  .catch(err => {
    console.error("❌ Failed to connect to MongoDB, server not started:", err);
    process.exit(1); // Exit if MongoDB connection fails
  });

function startServer() {
  // CORS for GitHub Pages
  const corsOptions = {
    origin: ['https://g4mechanger.github.io'],
    methods: ['GET', 'POST'],
    credentials: false
  };
  app.use(cors(corsOptions));

  app.use(express.json());

  // Serve frontend files if any (optional)
  app.use(express.static(path.join(__dirname, '../public')));

  // API routes
  app.post('/register', async (req, res) => {
    console.log("Received register request:", req.body);
    const { email, password } = req.body;
    const result = await registerUser(email, password);
    console.log("Register result:", result);
    res.json(result);
  });

  app.post('/login', async (req, res) => {
    console.log("Received login request:", req.body);
    const { email, password } = req.body;
    const users = db.collection('users');

    try {
      const user = await users.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        console.log("Login failed: Invalid email or password");
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }
      console.log("Login successful for user:", email);
      res.json({ success: true, message: "Login successful" });
    } catch (err) {
      console.error("Error during login:", err);
      res.status(500).json({ success: false, message: "Server error during login" });
    }
  });

  app.get('/users', async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Health check
  app.get("/", (req, res) => {
    res.send("BeeMazing backend is working!");
  });

  app.listen(port, () => {
    console.log(`✅ Server is running on http://localhost:${port}`);
  });
}