
const express = require("express");
const pool = require("../db/connect");
const { adminAuth, clientAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", adminAuth, async (req, res) => {
    try {
        const [loans] = await pool.query("SELECT l.*, c.fullname, c.phone, c.profile_photo FROM loans l JOIN clients c ON l.client_id = c.id ORDER BY l.created_at DESC");
        res.json({ success: true, loans });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.get("/my-loans", clientAuth, async (req, res) => {
    try {
        const [loans] = await pool.query("SELECT * FROM loans WHERE client_id = ? ORDER BY created_at DESC", [req.client.id]);
        res.json({ success: true, loans });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.get("/:id", async (req, res) => {
    try {
        const [loans] = await pool.query("SELECT * FROM loans WHERE id = ?", [req.params.id]);
        if (loans.length === 0) return res.json({ success: false, message: "Loan not found." });
        res.json({ success: true, loan: loans[0] });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

module.exports = router;
