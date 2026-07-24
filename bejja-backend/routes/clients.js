const express = require("express");
const pool = require("../db/connect");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", adminAuth, async (req, res) => {
    try {
        const [clients] = await pool.query("SELECT id, fullname, national_id, phone, email, occupation, employer, monthly_income, county, address, profile_photo, id_front, id_back, status, created_at FROM clients ORDER BY created_at DESC");
        res.json({ success: true, clients });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const [clients] = await pool.query("SELECT * FROM clients WHERE id = ?", [req.params.id]);
        if (clients.length === 0) return res.json({ success: false, message: "Client not found." });
        res.json({ success: true, client: clients[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const { fullname, email, occupation, employer, monthlyIncome, county, address, phone } = req.body;
        await pool.query("UPDATE clients SET fullname=?, email=?, occupation=?, employer=?, monthly_income=?, county=?, address=?, phone=? WHERE id=?", [fullname, email, occupation, employer, monthlyIncome, county, address, phone, req.params.id]);
        res.json({ success: true, message: "Client updated." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

router.put("/:id/suspend", adminAuth, async (req, res) => {
    try { await pool.query("UPDATE clients SET status='SUSPENDED' WHERE id=?", [req.params.id]); res.json({ success: true, message: "Client suspended." }); }
    catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.put("/:id/activate", adminAuth, async (req, res) => {
    try { await pool.query("UPDATE clients SET status='ACTIVE' WHERE id=?", [req.params.id]); res.json({ success: true, message: "Client activated." }); }
    catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.delete("/:id", adminAuth, async (req, res) => {
    try { await pool.query("DELETE FROM clients WHERE id=?", [req.params.id]); res.json({ success: true, message: "Client deleted." }); }
    catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

module.exports = router;
