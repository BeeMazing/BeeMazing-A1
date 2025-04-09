const express = require('express');
const cors = require('cors');
const path = require('path');
const { registerUser, getAllUsers } = require('./register');
const { connectDB } = require('./db');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ CORS for GitHub Pages
const corsOptions = {
  origin: ['https://g4mechanger.github.io'],
  methods: ['GET', 'POST'],
  credentials: false
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Serve frontend files (optional)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ REGISTER
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("📨 Registering admin:", email); // 👉 LOG before registration

    const result = await registerUser(email, password);

    console.log("✅ Registered admin:", result); // 👉 LOG result

    res.json({ ...result, role: "admin", success: true }); // ✅ Include role and success
  } catch (err) {
    console.error("🔥 Error in /register:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// ✅ LOGIN
app.post('/login', async (req, res) => {
  try {
    const { email, password, adminEmail } = req.body;
    if (!email || !password || !adminEmail) {
      console.log("❌ Missing required fields in /login request:", { email, password, adminEmail });
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    console.log(`🔍 Attempting login - email: ${email}, adminEmail: ${adminEmail}`);

    let db;
    try {
      db = await connectDB();
    } catch (dbErr) {
      console.error("❌ Failed to connect to database:", dbErr);
      return res.status(500).json({ success: false, message: "Database connection failed" });
    }

    const users = db.collection('users');
    const adminUsers = db.collection('adminUsers');

    // 1. Try to log in as an admin
    console.log(`🔍 Checking admin login for email: ${email}`);
    let user;
    try {
      user = await users.findOne({ email });
      console.log(`🔍 Admin user lookup result for ${email}:`, user ? "Found" : "Not found");
    } catch (err) {
      console.error(`❌ Error querying users collection for email ${email}:`, err);
      return res.status(500).json({ success: false, message: "Error querying users" });
    }

    if (user && user.password === password) {
      console.log("👑 Admin login successful:", email);
      return res.json({ success: true, role: "admin" });
    } else if (user) {
      console.log(`❌ Password mismatch for admin user ${email}`);
    } else {
      console.log(`❌ Admin user ${email} not found in users collection`);
    }

    // 2. Try to log in as an invited user under admin
    console.log(`🔍 Checking invited user login for adminEmail: ${adminEmail}`);
    let invited;
    try {
      invited = await adminUsers.findOne({ email: adminEmail });
      console.log(`🔍 Invited user lookup result for adminEmail ${adminEmail}:`, invited ? "Found" : "Not found");
    } catch (err) {
      console.error(`❌ Error querying adminUsers collection for adminEmail ${adminEmail}:`, err);
      return res.status(500).json({ success: false, message: "Error querying admin users" });
    }

    if (!invited) {
      console.log(`❌ No admin found with adminEmail: ${adminEmail}`);
      return res.status(401).json({ success: false, message: "Invalid admin email" });
    }

    if (!invited.passwords || !invited.users) {
      console.log(`❌ Admin ${adminEmail} has no passwords or users`);
      return res.status(401).json({ success: false, message: "No users associated with this admin" });
    }

    const matchingUser = Object.entries(invited.passwords || {}).find(
      ([username, storedPass]) => storedPass === password && invited.users.includes(username)
    );

    if (matchingUser) {
      const [username] = matchingUser;
      console.log("👤 Invited user login successful:", username);
      return res.json({ success: true, role: "user", username });
    }

    console.log("❌ Invalid credentials for email:", email);
    res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("🔥 Error in /login:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// ✅ GET ALL REGISTERED USERS (Not user-added ones)
app.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error("�fire Error in /users:", err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ✅ GET USERS ADDED BY SPECIFIC ADMIN
app.get('/get-users', async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ success: false, message: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');

    const adminDoc = await adminUsers.findOne({ email: adminEmail });

    res.json({
      success: true,
      users: adminDoc?.users || [],
      permissions: adminDoc?.permissions || {}
    });
  } catch (error) {
    console.error("🔥 Error in /get-users:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ ADD NEW USER TO SPECIFIC ADMIN
app.post('/add-user', async (req, res) => {
  const { adminEmail, newUser, tempPassword } = req.body;

  if (!adminEmail || !newUser || !tempPassword) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');

    // Add user and their password (per-admin scope)
    await adminUsers.updateOne(
      { email: adminEmail },
      {
        $addToSet: { users: newUser },
        $set: { [`passwords.${newUser}`]: tempPassword }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error in /add-user:", err);
    res.status(500).json({ success: false, message: "Failed to save user" });
  }
});

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("BeeMazing backend is working!");
});

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});

const nodemailer = require('nodemailer');
require('dotenv').config();

app.post('/send-invite', async (req, res) => {
  const { toEmail, name, tempPassword, adminEmail } = req.body;

  const inviteLink = `https://g4mechanger.github.io/BeeMazing-Y1/register.html?admin=${encodeURIComponent(adminEmail)}&user=${encodeURIComponent(name)}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"BeeMazing" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "You're Invited to Join BeeMazing!",
    html: `
      <h2>Hello ${name}!</h2>
      <p>You've been invited by <strong>${adminEmail}</strong> to join their BeeMazing family!</p>
      <p>Your temporary password is: <strong>${tempPassword}</strong></p>
      <p>Click the link below to join:</p>
      <a href="${inviteLink}" style="color: #FFC107;">Join BeeMazing</a>
      <br/><br/>
      <p>🐝 Let's get buzzing!</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent!' });
  } catch (err) {
    console.error("Email failed:", err);
    res.status(500).json({ success: false, error: "Failed to send email." });
  }
});