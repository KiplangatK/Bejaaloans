
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db/connect");
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "bejja_secret";

// CLIENT REGISTER
router.post("/register", async (req, res) => {
    try {
        const { fullname, nationalID, phone, email, occupation, employer, monthlyIncome, county, address, profilePhoto, idFront, idBack, password } = req.body;

        const [existing] = await pool.query("SELECT id FROM clients WHERE phone = ?", [phone]);
        if (existing.length > 0) return res.json({ success: false, message: "Phone number already registered." });

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            `INSERT INTO clients (fullname, national_id, phone, email, occupation, employer, monthly_income, county, address, profile_photo, id_front, id_back, password_hash, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURDATE())`,
            [fullname, nationalID, phone, email, occupation, employer, monthlyIncome, county, address, profilePhoto, idFront, idBack, passwordHash]
        );

        res.json({ success: true, message: "Account created successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// CLIENT LOGIN
router.post("/client-login", async (req, res) => {
    try {
        const { phone, password } = req.body;
        const [clients] = await pool.query("SELECT * FROM clients WHERE phone = ?", [phone]);
        if (clients.length === 0) return res.json({ success: false, message: "Phone number not registered." });

        const client = clients[0];
        const validPassword = await bcrypt.compare(password, client.password_hash);
        if (!validPassword) return res.json({ success: false, message: "Incorrect password." });
        if (client.status !== "ACTIVE") return res.json({ success: false, message: "Account disabled." });

        const token = jwt.sign({ id: client.id, phone: client.phone, type: "client" }, JWT_SECRET, { expiresIn: "24h" });

        res.json({
            success: true, message: "Login successful.", token,
            client: { id: client.id, fullname: client.fullname, phone: client.phone, email: client.email, nationalID: client.national_id, occupation: client.occupation, employer: client.employer, monthlyIncome: client.monthly_income, county: client.county, address: client.address, profilePhoto: client.profile_photo, idFront: client.id_front, idBack: client.id_back, status: client.status, createdAt: client.created_at }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ADMIN LOGIN
router.post("/admin-login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const [staff] = await pool.query("SELECT * FROM staff WHERE username = ? AND active = TRUE", [username]);
        if (staff.length === 0) return res.json({ success: false, message: "Invalid login details." });

        const admin = staff[0];
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) return res.json({ success: false, message: "Invalid login details." });

        const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role, type: "admin" }, JWT_SECRET, { expiresIn: "24h" });

        res.json({ success: true, token, admin: { id: admin.id, username: admin.username, role: admin.role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;
