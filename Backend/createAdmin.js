const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔹 Connected to MongoDB"))
    .catch(err => console.error(err));

const Admin = mongoose.model("Admin", {
    username: String,
    password: String,
    role: { type: String, default: "admin" }
});

(async () => {
    const hash = await bcrypt.hash("admin123", 10);

    await Admin.create({
        username: "admin",
        password: hash,
        role: "admin"
    });

    console.log("✅ Admin created");
    process.exit();
})();