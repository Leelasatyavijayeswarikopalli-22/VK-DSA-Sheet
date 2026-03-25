const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
// server.js
const path = require("path");
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

console.log("🔹 Server script running...");

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Schemas
const Admin = mongoose.model("Admin", {
    username: String,
    password: String,
    role: { type: String, default: "admin" } // admin or user
});

const Problem = mongoose.model("Problem", {
    title: String,
    link: String,
    category: String,
    section: String
});

// Routes

// Admin login
app.post("/admin-login", async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.json({ success: false });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.json({ success: false });

    res.json({ success: true, role: admin.role });
});

// Add problem (admin only)
app.post("/add-problem", async (req, res) => {
    const { username, title, link, category, section } = req.body;
    const user = await Admin.findOne({ username });

    if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
    }

    await Problem.create({ title, link, category, section });
    res.json({ success: true });
});

// Get all problems
app.get("/problems", async (req, res) => {
    const problems = await Problem.find();
    res.json(problems);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));