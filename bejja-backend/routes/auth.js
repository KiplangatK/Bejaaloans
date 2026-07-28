// ============================================
// BEJJA CREDIT - Authentication Routes
// ============================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db/connect");
const { generateToken, verifyToken, verifyClient, verifyAdmin } = require("../middleware/auth");
const { sendOTP, generateOTP } = require("../services/sms");

// ==================== CLIENT REGISTER ====================
router.post("/register", async (req, res) => {
    try {
        const {
            fullname, nationalID, phone, email, occupation, employer,
            monthlyIncome, county, address, password, profilePhoto,
            idFront, idBack
        } = req.body;

        // Validation
        if (!fullname || !nationalID || !phone || !password) {
            return res.status(400).json({ success: false, message: "Full name, National ID, phone, and password are required." });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }

        // Check if phone or national ID already exists
        const [existing] = await pool.query(
            "SELECT id FROM clients WHERE phone = ? OR national_id = ?",
            [phone, nationalID]
        );

        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Phone number or National ID already registered." 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert client
        const [result] = await pool.query(
            `INSERT INTO clients (
                fullname, national_id, phone, email, occupation, employer,
                monthly_income, county, address, password, profile_photo,
                id_front, id_back, phone_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
                fullname, nationalID, phone, email || null, occupation || null,
                employer || null, monthlyIncome || 0, county || null, address || null,
                hashedPassword, profilePhoto || null, idFront || null, idBack || null
            ]
        );

        // Generate token
        const token = generateToken({
            id: result.insertId,
            phone: phone,
            role: "client"
        });

        res.status(201).json({
            success: true,
            message: "Registration successful!",
            token,
            client: {
                id: result.insertId,
                fullname,
                phone,
                email,
                status: "ACTIVE"
            }
        });

    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ success: false, message: "Server error during registration." });
    }
});

// ==================== CLIENT LOGIN ====================
router.post("/client-login", async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ success: false, message: "Phone and password are required." });
        }

        // Find client
        const [clients] = await pool.query(
            "SELECT * FROM clients WHERE phone = ?",
            [phone]
        );

        if (clients.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid phone or password." });
        }

        const client = clients[0];

        // Check status
        if (client.status === "SUSPENDED") {
            return res.status(403).json({ success: false, message: "Your account has been suspended. Contact admin." });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, client.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: "Invalid phone or password." });
        }

        // Update last login
        await pool.query("UPDATE clients SET last_login = NOW() WHERE id = ?", [client.id]);

        // Generate token
        const token = generateToken({
            id: client.id,
            phone: client.phone,
            role: "client"
        });

        res.json({
            success: true,
            message: "Login successful!",
            token,
            client: {
                id: client.id,
                fullname: client.fullname,
                phone: client.phone,
                email: client.email,
                nationalID: client.national_id,
                occupation: client.occupation,
                employer: client.employer,
                monthlyIncome: client.monthly_income,
                county: client.county,
                address: client.address,
                profilePhoto: client.profile_photo,
                idFront: client.id_front,
                idBack: client.id_back,
                status: client.status,
                createdAt: client.created_at
            }
        });

    } catch (error) {
        console.error("Client login error:", error);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// ==================== ADMIN LOGIN ====================
router.post("/admin-login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required." });
        }

        // Find admin
        const [admins] = await pool.query(
            "SELECT * FROM admins WHERE username = ?",
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const admin = admins[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        // Update last login
        await pool.query("UPDATE admins SET last_login = NOW() WHERE id = ?", [admin.id]);

        // Generate token
        const token = generateToken({
            id: admin.id,
            username: admin.username,
            role: admin.role || "admin"
        });

        res.json({
            success: true,
            message: "Login successful!",
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                fullname: admin.fullname,
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// ==================== SEND OTP ====================
router.post("/send-otp", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number is required." });
        }

        // Generate OTP
        const otp = generateOTP(6);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in client record or update if client exists
        const [clients] = await pool.query(
            "SELECT id FROM clients WHERE phone = ?",
            [phone]
        );

        if (clients.length > 0) {
            await pool.query(
                "UPDATE clients SET otp_code = ?, otp_expires_at = ? WHERE phone = ?",
                [otp, expiresAt, phone]
            );
        }

        // Send OTP via SMS
        const smsResult = await sendOTP(phone, otp);

        res.json({
            success: true,
            message: "OTP sent successfully!",
            sandboxOTP: process.env.AT_API_KEY === "sandbox" ? otp : undefined
        });

    } catch (error) {
        console.error("Send OTP error:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP." });
    }
});

// ==================== VERIFY OTP ====================
router.post("/verify-otp", async (req, res) => {
    try {
        const { phone, code } = req.body;

        if (!phone || !code) {
            return res.status(400).json({ success: false, message: "Phone and code are required." });
        }

        const [clients] = await pool.query(
            "SELECT id, otp_code, otp_expires_at FROM clients WHERE phone = ?",
            [phone]
        );

        if (clients.length === 0) {
            return res.status(404).json({ success: false, message: "No account found with this phone." });
        }

        const client = clients[0];

        if (client.otp_code !== code) {
            return res.status(400).json({ success: false, message: "Invalid verification code." });
        }

        if (new Date(client.otp_expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: "Verification code has expired." });
        }

        // Mark phone as verified
        await pool.query(
            "UPDATE clients SET phone_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?",
            [client.id]
        );

        res.json({ success: true, message: "Phone verified successfully!" });

    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ success: false, message: "Failed to verify OTP." });
    }
});

// ==================== GET PROFILE (Client) ====================
router.get("/profile", verifyClient, async (req, res) => {
    try {
        const [clients] = await pool.query(
            "SELECT id, fullname, national_id, phone, email, occupation, employer, monthly_income, county, address, profile_photo, id_front, id_back, status, phone_verified, created_at FROM clients WHERE id = ?",
            [req.user.id]
        );

        if (clients.length === 0) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        const client = clients[0];
        res.json({
            success: true,
            client: {
                id: client.id,
                fullname: client.fullname,
                nationalID: client.national_id,
                phone: client.phone,
                email: client.email,
                occupation: client.occupation,
                employer: client.employer,
                monthlyIncome: client.monthly_income,
                county: client.county,
                address: client.address,
                profilePhoto: client.profile_photo,
                idFront: client.id_front,
                idBack: client.id_back,
                status: client.status,
                phoneVerified: client.phone_verified,
                createdAt: client.created_at
            }
        });

    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;