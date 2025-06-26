const express = require("express");
const cors = require("cors");
const path = require("path");
const { registerUser, getAllUsers } = require("./register");
const { connectDB } = require("./db");

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
  origin: [
    "https://beemazing.github.io",
    "http://127.0.0.1:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// REGISTER endpoint
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await registerUser(email, password);
    res.json(result);
  } catch (err) {
    console.error("Error in /register:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
});

// LOGIN endpoint with improved error handling
app.post("/login", async (req, res) => {
  try {
    console.log("Login attempt for:", req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing email or password"
      });
    }

    const db = await connectDB();
    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user || user.password !== password) {
      console.log("Invalid credentials for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    console.log("Login successful for:", email);
    res.json({ success: true, message: "Login successful" });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
});

// GET tasks endpoint
app.get("/api/tasks", async (req, res) => {
  try {
    const { adminEmail } = req.query;
    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      tasks: admin.tasks || [],
      rewards: admin.rewards || {}
    });

  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST complete-task endpoint
app.post("/api/complete-task", async (req, res) => {
  try {
    const { adminEmail, taskTitle, user, date, originalAssignee } = req.body;

    if (!adminEmail || !taskTitle || !user || !date) {
      return res.status(400).json({
        error: "Missing required fields: adminEmail, taskTitle, user, or date"
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    const normalizedDate = date.split("T")[0];

    const taskIndex = tasks.findIndex((t) => {
      if (t.title !== taskTitle) return false;
      const [startDateStr, endDateStr] = t.date.split(" to ");
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr || "3000-01-01");
      const currentDate = new Date(normalizedDate);
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskIndex];

    // Initialize completion structures
    if (!task.completedDates) {
      task.completedDates = {};
    }
    if (!task.completedDates[normalizedDate]) {
      task.completedDates[normalizedDate] = [];
    }

    // Add completion record
    const completionRecord = {
      user: user,
      completedAt: new Date().toISOString(),
      reward: task.reward || 0,
      repetition: 1,
      originalAssignee: originalAssignee || null
    };

    task.completedDates[normalizedDate].push(completionRecord);

    // Award reward
    const rewardAmount = Number(task.reward || 0);
    if (rewardAmount > 0) {
      const rewards = admin.rewards || {};
      rewards[user] = (rewards[user] || 0) + rewardAmount;
      await admins.updateOne(
        { email: adminEmail },
        { $set: { rewards, tasks } }
      );
    } else {
      await admins.updateOne(
        { email: adminEmail },
        { $set: { tasks } }
      );
    }

    console.log("Task completed:", { taskTitle, user, originalAssignee });
    res.json({
      success: true,
      message: "Task completed successfully",
      reward: rewardAmount
    });

  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

// Start server
const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
