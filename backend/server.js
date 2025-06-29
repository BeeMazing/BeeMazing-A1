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
    "https://g4mechanger.github.io",
    "https://beemazing.github.io",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/check-admin-password",
      "/verify-admin-password",
      "/set-admin-password",
    ],
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("BeeMazing backend is working!");
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve manifest.json
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "../manifest.json"));
});

// AUTHENTICATION ENDPOINTS
app.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await registerUser(email, password);
    res.json(result);
  } catch (err) {
    console.error("Error in /register:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    console.log("Login attempt for:", req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing email or password",
      });
    }

    const db = await connectDB();
    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user || user.password !== password) {
      console.log("Invalid credentials for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("Login successful for:", email);
    res.json({ success: true, message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

// ADMIN PASSWORD ENDPOINTS
app.post("/set-admin-password", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing email or password",
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    await admins.updateOne(
      { email },
      { $set: { adminPassword: password } },
      { upsert: true },
    );

    console.log("Admin password set for:", email);
    res.json({ success: true, message: "Admin password set successfully" });
  } catch (error) {
    console.error("Error setting admin password:", error);
    res.status(500).json({
      success: false,
      message: "Server error setting admin password",
    });
  }
});

app.post("/check-admin-password", async (req, res) => {
  try {
    console.log("🔍 /check-admin-password called with:", req.body);
    const { email } = req.body;

    if (!email) {
      console.log("❌ Missing email in request");
      return res.status(400).json({
        success: false,
        message: "Missing email",
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email });
    const hasPassword = admin && admin.adminPassword;

    console.log("✅ Admin password check result:", {
      email,
      hasPassword: !!hasPassword,
    });
    res.json({
      success: true,
      hasPassword: !!hasPassword,
    });
  } catch (error) {
    console.error("❌ Error checking admin password:", error);
    res.status(500).json({
      success: false,
      message: "Server error checking admin password",
    });
  }
});

app.post("/verify-admin-password", async (req, res) => {
  try {
    console.log("🔍 /verify-admin-password called with:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
    });
    const { email, password } = req.body;

    if (!email || password === undefined) {
      console.log("❌ Missing email or password in request");
      return res.status(400).json({
        success: false,
        message: "Missing email or password",
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const adminUsers = db.collection("adminUsers");
    const admin = await admins.findOne({ email });

    if (!admin || admin.adminPassword !== password) {
      console.log("❌ Invalid admin password for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid admin password",
      });
    }

    // Get admin permissions data
    const adminDoc = await adminUsers.findOne({ email });
    const permissions = adminDoc?.permissions || {};
    const users = adminDoc?.users || [];

    console.log("✅ Admin password verified for:", email);
    res.json({
      success: true,
      message: "Admin password verified",
      permissions: permissions,
      users: users,
    });
  } catch (error) {
    console.error("❌ Error verifying admin password:", error);
    res.status(500).json({
      success: false,
      message: "Server error verifying admin password",
    });
  }
});

app.post("/change-admin-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing email, current password, or new password",
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email });

    if (!admin || admin.adminPassword !== currentPassword) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await admins.updateOne({ email }, { $set: { adminPassword: newPassword } });

    console.log("Admin password changed for:", email);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({
      success: false,
      message: "Server error changing password",
    });
  }
});

// USER MANAGEMENT ENDPOINTS
app.get("/users", async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/get-users", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");
    const adminDoc = await adminUsers.findOne({ email: adminEmail });

    if (!adminDoc) {
      return res.json({
        success: true,
        users: [],
        permissions: {},
        avatars: {},
      });
    }

    const users = adminDoc.users || Object.keys(adminDoc.permissions || {});
    const permissions = adminDoc.permissions || {};
    const avatars = adminDoc.avatars || {};

    res.json({
      success: true,
      users,
      permissions,
      avatars,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting users",
    });
  }
});

app.post("/add-user", async (req, res) => {
  try {
    const { adminEmail, newUser, role } = req.body;

    if (!adminEmail || !newUser) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail or newUser",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    // Add user to the users array (if not already added)
    await adminUsers.updateOne(
      { email: adminEmail },
      { $addToSet: { users: newUser } }, // avoids duplicates
      { upsert: true },
    );

    // Set their role in permissions
    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { [`permissions.${newUser}`]: role || "User" } },
      { upsert: true },
    );

    console.log("User added:", { adminEmail, newUser, role });
    res.json({ success: true, message: "User added successfully" });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({
      success: false,
      message: "Server error adding user",
    });
  }
});

app.delete("/delete-user", async (req, res) => {
  try {
    const { adminEmail, username } = req.query;

    if (!adminEmail || !username) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail or username",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    const admin = await adminUsers.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Remove user from users array and permissions
    const updatedUsers = (admin.users || []).filter(
      (user) => user !== username,
    );

    // Update the admin's user list in the database
    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { users: updatedUsers } },
    );

    await adminUsers.updateOne(
      { email: adminEmail },
      { $unset: { [`permissions.${username}`]: "" } },
    );

    console.log("User deleted:", { adminEmail, username });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
    });
  }
});

app.post("/rename-user", async (req, res) => {
  try {
    const { adminEmail, oldName, newName } = req.body;

    if (!adminEmail || !oldName || !newName) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail, oldName, or newName",
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const adminUsers = db.collection("adminUsers");

    // Get current permission
    const adminDoc = await adminUsers.findOne({ email: adminEmail });
    const currentPermission = adminDoc?.permissions?.[oldName] || "User";

    // Update permissions
    await adminUsers.updateOne(
      { email: adminEmail },
      {
        $set: { [`permissions.${newName}`]: currentPermission },
        $unset: { [`permissions.${oldName}`]: "" },
      },
    );

    // Update tasks
    const admin = await admins.findOne({ email: adminEmail });
    if (admin && admin.tasks) {
      const updatedTasks = admin.tasks.map((task) => ({
        ...task,
        users: task.users.map((user) => (user === oldName ? newName : user)),
      }));

      await admins.updateOne(
        { email: adminEmail },
        { $set: { tasks: updatedTasks } },
      );
    }

    console.log("User renamed:", { adminEmail, oldName, newName });
    res.json({ success: true, message: "User renamed successfully" });
  } catch (error) {
    console.error("Error renaming user:", error);
    res.status(500).json({
      success: false,
      message: "Server error renaming user",
    });
  }
});

app.post("/save-permissions", async (req, res) => {
  try {
    const { adminEmail, permissions } = req.body;

    if (!adminEmail || !permissions) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail or permissions",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { permissions } },
      { upsert: true },
    );

    console.log("Permissions saved for:", adminEmail);
    res.json({ success: true, message: "Permissions saved successfully" });
  } catch (error) {
    console.error("Error saving permissions:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving permissions",
    });
  }
});

app.get("/get-permission", async (req, res) => {
  try {
    const { adminEmail, username } = req.query;

    if (!adminEmail || !username) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail or username",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");
    const adminDoc = await adminUsers.findOne({ email: adminEmail });

    const permission = adminDoc?.permissions?.[username] || "User";

    res.json({ success: true, permission });
  } catch (error) {
    console.error("Error getting permission:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting permission",
    });
  }
});

// AVATAR ENDPOINTS
app.get("/get-avatar", async (req, res) => {
  try {
    const { adminEmail, user } = req.query;

    if (!adminEmail || !user) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail or user",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");
    const adminDoc = await adminUsers.findOne({ email: adminEmail });

    if (!adminDoc || !adminDoc.avatars || !adminDoc.avatars[user]) {
      return res.json({
        success: true,
        avatar: "/BeeMazing-A1/shared/Avatars/default.png",
      });
    }

    res.json({
      success: true,
      avatar: adminDoc.avatars[user],
    });
  } catch (error) {
    console.error("Error getting avatar:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting avatar",
    });
  }
});

app.post("/set-avatar", async (req, res) => {
  try {
    const { adminEmail, user, avatar } = req.body;

    if (!adminEmail || !user || !avatar) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail, user, or avatar",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { [`avatars.${user}`]: avatar } },
      { upsert: true },
    );

    res.json({
      success: true,
      message: "Avatar updated successfully",
    });
  } catch (error) {
    console.error("Error setting avatar:", error);
    res.status(500).json({
      success: false,
      message: "Server error setting avatar",
    });
  }
});

// TASK MANAGEMENT ENDPOINTS
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
      rewards: admin.rewards || {},
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const { adminEmail, task } = req.body;
    if (!adminEmail || !task) {
      return res.status(400).json({ error: "Missing adminEmail or task" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });
    const updatedTasks = admin?.tasks || [];
    const taskIndex = updatedTasks.findIndex(
      (t) => t.title === task.title && t.date === task.date,
    );

    if (taskIndex >= 0) {
      updatedTasks[taskIndex] = task;
    } else {
      updatedTasks.push(task);
    }

    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks: updatedTasks } },
      { upsert: true },
    );

    console.log("Task saved:", { title: task.title, users: task.users });
    res.json({ success: true, message: "Task saved successfully" });
  } catch (error) {
    console.error("Error saving task:", error);
    res.status(500).json({ error: "Failed to save task" });
  }
});

app.put("/api/tasks", async (req, res) => {
  try {
    const { adminEmail, task, originalTitle, originalDate } = req.body;
    if (!adminEmail || !task || !originalTitle || !originalDate) {
      return res.status(400).json({
        error: "Missing adminEmail, task, originalTitle, or originalDate",
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    const taskIndex = tasks.findIndex(
      (t) => t.title === originalTitle && t.date === originalDate,
    );

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Original task not found" });
    }

    tasks[taskIndex] = task;

    await admins.updateOne({ email: adminEmail }, { $set: { tasks } });

    console.log("Task updated:", { originalTitle, newTitle: task.title });
    res.json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/api/tasks", async (req, res) => {
  try {
    const { adminEmail, title, date } = req.query;

    if (!adminEmail || !title) {
      return res.status(400).json({ error: "Missing adminEmail or title" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    const updatedTasks = tasks.filter((task) => {
      if (date) {
        return !(task.title === title && task.date === date);
      } else {
        return task.title !== title;
      }
    });

    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks: updatedTasks } },
    );

    console.log("Task deleted:", { title, date });
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// TASK COMPLETION ENDPOINT
app.post("/api/complete-task", async (req, res) => {
  try {
    const {
      adminEmail,
      taskTitle,
      user,
      date,
      originalAssignee,
      parentApproval,
    } = req.body;

    if (!adminEmail || !taskTitle || !user || !date) {
      return res.status(400).json({
        error: "Missing required fields: adminEmail, taskTitle, user, or date",
      });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const adminUsers = db.collection("adminUsers");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if user is an Admin
    const adminDoc = await adminUsers.findOne({ email: adminEmail });
    const isAdmin = adminDoc?.permissions?.[user] === "Admin";
    console.log("🔍 /api/complete-task: User permission", { user, isAdmin });

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

    // Check if task requires parent approval OR if user is admin (admins can bypass approval)
    const requiresApproval = task.parentApproval === true && !isAdmin;

    console.log("🔍 /api/complete-task: Approval decision debug", {
      taskTitle,
      user,
      parentApproval: task.parentApproval,
      isAdmin,
      requiresApproval,
      decision: requiresApproval ? "PENDING_APPROVAL" : "DIRECT_COMPLETION",
    });

    if (requiresApproval) {
      // Add to pending completions
      if (!task.pendingCompletions) {
        task.pendingCompletions = {};
      }
      if (!task.pendingCompletions[normalizedDate]) {
        task.pendingCompletions[normalizedDate] = [];
      }

      const pendingRecord = {
        user: user,
        timestamp: new Date().toISOString(),
        originalAssignee: originalAssignee || null,
        isPending: true,
        pendingId: `pending_${Date.now()}_${Math.random()}`,
      };

      task.pendingCompletions[normalizedDate].push(pendingRecord);

      await admins.updateOne({ email: adminEmail }, { $set: { tasks } });

      console.log("Task marked for approval:", {
        taskTitle,
        user,
        originalAssignee,
      });
      res.json({
        success: true,
        message: "Task completion submitted for approval",
        requiresApproval: true,
      });
    } else {
      // Direct completion
      const completionRecord = {
        user: user,
        completedAt: new Date().toISOString(),
        reward: task.reward || 0,
        repetition: 1,
        originalAssignee: originalAssignee || null,
      };

      task.completedDates[normalizedDate].push(completionRecord);

      // Award reward
      const rewardAmount = Number(task.reward || 0);
      if (rewardAmount > 0) {
        const rewards = admin.rewards || {};
        rewards[user] = (rewards[user] || 0) + rewardAmount;
        await admins.updateOne(
          { email: adminEmail },
          { $set: { rewards, tasks } },
        );
      } else {
        await admins.updateOne({ email: adminEmail }, { $set: { tasks } });
      }

      console.log("✅ /api/complete-task: Task completed", {
        originalAssigneeDetected: originalAssignee,
        completingUser: user,
        isCrossCompletion: originalAssignee && originalAssignee !== user,
        user,
        taskTitle,
        rewardAmount,
        requiresApproval: false,
        isAdmin,
        parentApproval: task.parentApproval,
      });
      res.json({
        success: true,
        message: "Task completed successfully",
        reward: rewardAmount,
      });
    }
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

// APPROVAL ENDPOINTS
app.post("/api/approve-task", async (req, res) => {
  try {
    const { adminEmail, taskTitle, user, date, decision } = req.body;

    if (!adminEmail || !taskTitle || !user || !date || !decision) {
      return res.status(400).json({
        error: "Missing required fields",
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

    const taskIndex = tasks.findIndex((t) => t.title === taskTitle);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskIndex];

    if (decision === "approve") {
      // Move from pending to completed
      const pending = task.pendingCompletions?.[normalizedDate] || [];
      const pendingIndex = pending.findIndex((p) => p.user === user);

      if (pendingIndex !== -1) {
        const pendingEntry = pending[pendingIndex];

        // Remove from pending
        pending.splice(pendingIndex, 1);

        // Add to completed
        if (!task.completedDates) {
          task.completedDates = {};
        }
        if (!task.completedDates[normalizedDate]) {
          task.completedDates[normalizedDate] = [];
        }

        const completionRecord = {
          user: user,
          completedAt: new Date().toISOString(),
          reward: task.reward || 0,
          repetition: 1,
          originalAssignee: pendingEntry.originalAssignee || null,
        };

        task.completedDates[normalizedDate].push(completionRecord);

        // Award reward
        const rewardAmount = Number(task.reward || 0);
        if (rewardAmount > 0) {
          const rewards = admin.rewards || {};
          rewards[user] = (rewards[user] || 0) + rewardAmount;
          await admins.updateOne(
            { email: adminEmail },
            { $set: { rewards, tasks } },
          );
        } else {
          await admins.updateOne({ email: adminEmail }, { $set: { tasks } });
        }
      }
    } else if (decision === "decline") {
      // Remove from pending
      const pending = task.pendingCompletions?.[normalizedDate] || [];
      const pendingIndex = pending.findIndex((p) => p.user === user);

      if (pendingIndex !== -1) {
        pending.splice(pendingIndex, 1);
        await admins.updateOne({ email: adminEmail }, { $set: { tasks } });
      }
    }

    console.log("Task approval processed:", { taskTitle, user, decision });
    res.json({ success: true, message: "Approval processed successfully" });
  } catch (error) {
    console.error("Error processing approval:", error);
    res.status(500).json({ error: "Failed to process approval" });
  }
});

// REWARDS ENDPOINTS
app.get("/api/rewards", async (req, res) => {
  try {
    const { adminEmail } = req.query;
    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    res.json({ rewards: admin?.rewards || {} });
  } catch (error) {
    console.error("Error fetching rewards:", error);
    res.status(500).json({ error: "Failed to fetch rewards" });
  }
});

app.post("/api/rewards", async (req, res) => {
  try {
    const { adminEmail, user, amount } = req.body;
    if (!adminEmail || !user || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    const rewards = admin?.rewards || {};
    rewards[user] = (rewards[user] || 0) + Number(amount);

    await admins.updateOne(
      { email: adminEmail },
      { $set: { rewards } },
      { upsert: true },
    );

    console.log("Reward added:", { user, amount });
    res.json({ success: true, message: "Reward added successfully" });
  } catch (error) {
    console.error("Error adding reward:", error);
    res.status(500).json({ error: "Failed to add reward" });
  }
});

// MARKET REWARDS ENDPOINTS
app.get("/api/market-rewards", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    res.json({ marketRewards: admin?.marketRewards || [] });
  } catch (error) {
    console.error("Error fetching market rewards:", error);
    res.status(500).json({ error: "Failed to fetch market rewards" });
  }
});

app.post("/api/market-rewards", async (req, res) => {
  try {
    const { adminEmail, rewards } = req.body;

    if (!adminEmail || !Array.isArray(rewards)) {
      return res
        .status(400)
        .json({ error: "Missing adminEmail or rewards array" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { marketRewards: rewards } },
      { upsert: true },
    );

    console.log("Market rewards updated for:", adminEmail);
    res.json({ success: true, message: "Market rewards updated successfully" });
  } catch (error) {
    console.error("Error updating market rewards:", error);
    res.status(500).json({ error: "Failed to update market rewards" });
  }
});

// USER ID MAPPING ENDPOINTS
app.post("/api/user-id-mapping", async (req, res) => {
  try {
    const { adminEmail, userIdMap } = req.body;

    if (!adminEmail || !userIdMap) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail or userIdMap",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    // Store the user ID mapping
    await adminUsers.updateOne(
      { email: adminEmail },
      {
        $set: {
          userIdMap: userIdMap,
          userIdMapCreated: new Date().toISOString(),
        },
      },
      { upsert: true },
    );

    console.log("User ID mapping saved for:", adminEmail);
    res.json({ success: true, message: "User ID mapping saved successfully" });
  } catch (error) {
    console.error("Error saving user ID mapping:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving user ID mapping",
    });
  }
});

app.get("/api/user-id-mapping", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");
    const adminDoc = await adminUsers.findOne({ email: adminEmail });
    const userIdMap = adminDoc?.userIdMap || {};

    res.json({
      success: true,
      userIdMap: userIdMap,
      created: adminDoc?.userIdMapCreated,
    });
  } catch (error) {
    console.error("Error getting user ID mapping:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting user ID mapping",
    });
  }
});

// AVATAR MANAGEMENT ENDPOINTS
app.post("/api/save-avatar", async (req, res) => {
  try {
    const { adminEmail, userName, avatar } = req.body;

    if (!adminEmail || !userName || !avatar) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail, userName, or avatar",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    console.log(`Saving avatar for ${userName} under ${adminEmail}: ${avatar}`);

    const admin = (await adminUsers.findOne({ email: adminEmail })) || {};
    const avatars = admin.avatars || {};

    avatars[userName] = avatar;

    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { avatars } },
      { upsert: true },
    );

    console.log("Avatar saved successfully");
    res.json({ success: true, message: "Avatar saved successfully" });
  } catch (error) {
    console.error("Error saving avatar:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving avatar",
    });
  }
});

app.get("/api/get-avatar", async (req, res) => {
  try {
    const { adminEmail, user } = req.query;

    if (!adminEmail || !user) {
      return res.status(400).json({
        success: false,
        message: "Missing adminEmail or user",
      });
    }

    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");
    const admin = await adminUsers.findOne({ email: adminEmail });

    if (!admin || !admin.avatars || !admin.avatars[user]) {
      return res.status(404).json({
        success: false,
        message: "Avatar not found",
      });
    }

    res.json({
      success: true,
      avatar: admin.avatars[user],
    });
  } catch (error) {
    console.error("Error getting avatar:", error);
    res.status(500).json({
      success: false,
      message: "Server error getting avatar",
    });
  }
});

// PASSWORD RESET ENDPOINTS
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Missing email" });
    }

    const db = await connectDB();
    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // In a real implementation, you would send an email here
    console.log("Password reset requested for:", email);
    res.json({
      success: true,
      message: "Password reset instructions sent to your email",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing password reset",
    });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing reset token or new password",
      });
    }

    // In a real implementation, you would validate the reset token here
    console.log("Password reset completed for token:", resetToken);
    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "Server error resetting password",
    });
  }
});

// ✅ Get reward requests for an admin
/*
app.get("/api/reward-requests", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    const pendingRewardRequests = admin?.pendingRewardRequests || [];
    const rewardHistory = admin?.rewardHistory || {};

    // Combine pending requests with approved/declined requests from history
    const allRequests = [...pendingRewardRequests];

    // Add approved/declined requests from history back to the requests list
    Object.keys(rewardHistory).forEach((user) => {
      const userHistory = rewardHistory[user] || [];
      userHistory.forEach((historyItem) => {
        // Only include approved/declined items (not received ones)
        if (
          historyItem.status === "Approved" ||
          historyItem.status === "Declined"
        ) {
          allRequests.push({
            user: user,
            rewardName: historyItem.rewardName,
            rewardCost: historyItem.rewardCost,
            status: historyItem.status.toLowerCase(),
            timestamp: new Date(historyItem.timestamp).getTime(),
          });
        }
      });
    });

    res.json({ success: true, requests: allRequests });
  } catch (err) {
    console.error("Error fetching reward requests:", err);
    res.status(500).json({ error: "Failed to fetch reward requests" });
  }
});

// ✅ Get reward history for an admin
app.get("/api/reward-history", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    res.json({ rewardHistory: admin?.rewardHistory || {} });
  } catch (err) {
    console.error("Error fetching reward history:", err);
    res.status(500).json({ error: "Failed to fetch reward history" });
  }
});

// ✅ Save reward history for an admin
app.post("/api/reward-history", async (req, res) => {
  try {
    const { adminEmail, rewardHistory } = req.body;

    if (!adminEmail || !rewardHistory) {
      return res
        .status(400)
        .json({ error: "Missing adminEmail or rewardHistory" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { rewardHistory } },
      { upsert: true },
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving reward history:", err);
    res.status(500).json({ error: "Failed to save reward history" });
  }
});

// ✅ Save a pending reward request
app.post("/api/reward-request", async (req, res) => {
  try {
    const { adminEmail, user, rewardName, rewardCost, deductPoints } = req.body;

    if (!adminEmail || !user || !rewardName || rewardCost === undefined) {
      return res
        .status(400)
        .json({ error: "Missing adminEmail, user, rewardName, or rewardCost" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    const rewards = admin?.rewards || {};
    const pendingRewardRequests = admin?.pendingRewardRequests || [];

    // Check if user has enough points
    const userPoints = rewards[user] || 0;
    if (deductPoints && userPoints < rewardCost) {
      return res.status(400).json({ error: "Insufficient points" });
    }

    // Deduct points if requested
    if (deductPoints) {
      rewards[user] = userPoints - rewardCost;
    }

    // Add to pending requests
    pendingRewardRequests.push({
      user,
      rewardName,
      rewardCost,
      status: "pending",
      timestamp: Date.now(),
    });

    await admins.updateOne(
      { email: adminEmail },
      { $set: { rewards, pendingRewardRequests } },
      { upsert: true },
    );

    res.json({ success: true, message: "Reward request submitted" });
  } catch (err) {
    console.error("Error saving reward request:", err);
    res.status(500).json({ error: "Failed to save reward request" });
  }
});

// ✅ Approve or decline a reward request
app.post("/api/review-reward", async (req, res) => {
  try {
    const { adminEmail, requestIndex, decision, user, rewardName, timestamp } =
      req.body;

    if (!adminEmail || !decision) {
      return res.status(400).json({ error: "Missing adminEmail or decision" });
    }

    if (!["approve", "decline"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const pendingRewardRequests = admin.pendingRewardRequests || [];

    // Find request by timestamp, user, and rewardName
    let requestIndex_actual = -1;

    if (user && rewardName && timestamp) {
      requestIndex_actual = pendingRewardRequests.findIndex(
        (req) =>
          req.user === user &&
          req.rewardName === rewardName &&
          req.timestamp === parseInt(timestamp),
      );
    } else if (
      requestIndex !== undefined &&
      requestIndex < pendingRewardRequests.length
    ) {
      requestIndex_actual = requestIndex;
    }

    if (
      requestIndex_actual === -1 ||
      !pendingRewardRequests[requestIndex_actual]
    ) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = pendingRewardRequests[requestIndex_actual];

    // Get all necessary data structures
    const rewards = admin.rewards || {};
    const userRewards = admin.userRewards || {};
    const rewardHistory = admin.rewardHistory || {};
    const marketRewards = admin.marketRewards || [];

    // Update or create reward history entry
    if (!rewardHistory[request.user]) {
      rewardHistory[request.user] = [];
    }

    // Add to history with new status
    rewardHistory[request.user].push({
      rewardName: request.rewardName,
      rewardCost: request.rewardCost,
      status: decision === "approve" ? "Approved" : "Declined",
      timestamp: new Date(request.timestamp).toISOString(),
    });

    if (decision === "decline") {
      // Refund points for declined rewards
      rewards[request.user] = (rewards[request.user] || 0) + request.rewardCost;

      // For one-time rewards, remove user from claimedBy array to make it available again
      const marketReward = marketRewards.find(
        (reward) => reward.name === request.rewardName,
      );
      if (
        marketReward &&
        marketReward.type === "oneTime" &&
        marketReward.claimedBy
      ) {
        marketReward.claimedBy = marketReward.claimedBy.filter(
          (username) => username !== request.user,
        );
      }
    }

    // Remove from pending
    pendingRewardRequests.splice(requestIndex_actual, 1);

    // Update database with all changes
    await admins.updateOne(
      { email: adminEmail },
      {
        $set: {
          pendingRewardRequests,
          rewards,
          userRewards,
          rewardHistory,
          marketRewards,
        },
      },
    );

    res.json({ success: true, message: `Reward ${decision}d successfully` });
  } catch (err) {
    console.error("Error processing reward request:", err);
    res.status(500).json({
      error: "Failed to process reward request",
      details: err.message,
    });
  }
});

// ✅ Save user rewards for an admin
app.post("/api/user-rewards", async (req, res) => {
  try {
    const { adminEmail, userRewards } = req.body;

    if (!adminEmail || !userRewards) {
      return res
        .status(400)
        .json({ error: "Missing adminEmail or userRewards" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { userRewards } },
      { upsert: true },
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving user rewards:", err);
    res.status(500).json({ error: "Failed to save user rewards" });
  }
});

// ✅ Get user rewards for an admin
app.get("/api/user-rewards", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    res.json({ userRewards: admin?.userRewards || {} });
  } catch (err) {
    console.error("Error fetching user rewards:", err);
    res.status(500).json({ error: "Failed to fetch user rewards" });
  }
});
*/

// ✅ Get reward history for an admin
app.get("/api/reward-history", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.json({ rewardHistory: {} });
    }

    res.json({ rewardHistory: admin.rewardHistory || {} });
  } catch (err) {
    console.error("Error fetching reward history:", err);
    res.status(500).json({ error: "Failed to fetch reward history" });
  }
});

// ✅ Get reward requests for an admin
app.get("/api/reward-requests", async (req, res) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.json({ success: true, requests: [] });
    }

    const pendingRewardRequests = admin.pendingRewardRequests || [];
    const rewardHistory = admin.rewardHistory || {};

    // Combine pending requests with approved/declined requests from history
    const allRequests = [...pendingRewardRequests];

    // Add approved/declined requests from history back to the requests list
    if (rewardHistory && typeof rewardHistory === "object") {
      Object.keys(rewardHistory).forEach((user) => {
        const userHistory = rewardHistory[user] || [];
        if (Array.isArray(userHistory)) {
          userHistory.forEach((historyItem) => {
            // Only include approved/declined items (not received ones)
            if (
              historyItem &&
              (historyItem.status === "Approved" ||
                historyItem.status === "Declined")
            ) {
              allRequests.push({
                user: user,
                rewardName: historyItem.rewardName,
                rewardCost: historyItem.rewardCost,
                status: historyItem.status.toLowerCase(),
                timestamp: historyItem.timestamp
                  ? new Date(historyItem.timestamp).getTime()
                  : Date.now(),
              });
            }
          });
        }
      });
    }

    res.json({ success: true, requests: allRequests });
  } catch (err) {
    console.error("Error fetching reward requests:", err);
    res.status(500).json({ error: "Failed to fetch reward requests" });
  }
});

// Start server
const server = app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
  console.log(`🔗 Available endpoints:`);
  console.log(`   POST /check-admin-password`);
  console.log(`   POST /verify-admin-password`);
  console.log(`   POST /set-admin-password`);
  console.log(`   GET /health`);
});

// Set timeout
server.timeout = 30000;

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("📡 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("📡 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
