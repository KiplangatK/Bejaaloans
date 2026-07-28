// ============================================
// BEJJA CREDIT - Client Management Routes
// ============================================

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../db/connect");
const { verifyAdmin } = require("../middleware/auth");

// ==================== GET ALL CLIENTS ====================
router.get("/", verifyAdmin, async (req, res) => {
    try {
        const [clients] = await pool.query(
            `SELECT id, fullname, national_id, phone, email, occupation, employer, 
                    monthly_income, county, address, profile_photo, id_front, id_back, 
                    status, phone_verified, last_login, created_at, updated_at 
             FROM clients 
             ORDER BY created_at DESC`
        );

        const formatted = clients.map(c => ({
            id: c.id,
            fullname: c.fullname,
            national_id: c.national_id,
            phone: c.phone,
            email: c.email,
            occupation: c.occupation,
            employer: c.employer,
            monthly_income: c.monthly_income,
            county: c.county,
            address: c.address,
            profile_photo: c.profile_photo,
            id_front: c.id_front,
            id_back: c.id_back,
            status: c.status,
            phone_verified: c.phone_verified,
            last_login: c.last_login,
            created_at: c.created_at,
            updated_at: c.updated_at
        }));

        res.json({ success: true, clients: formatted });

    } catch (error) {
        console.error("Get clients error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== GET SINGLE CLIENT ====================
router.get("/:id", verifyAdmin, async (req, res) => {
    try {
        const [clients] = await pool.query(
            `SELECT id, fullname, national_id, phone, email, occupation, employer,
                    monthly_income, county, address, profile_photo, id_front, id_back,
                    status, phone_verified, last_login, created_at, updated_at
             FROM clients WHERE id = ?`,
            [req.params.id]
        );

        if (clients.length === 0) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        const c = clients[0];
        res.json({
            success: true,
            client: {
                id: c.id,
                fullname: c.fullname,
                national_id: c.national_id,
                phone: c.phone,
                email: c.email,
                occupation: c.occupation,
                employer: c.employer,
                monthly_income: c.monthly_income,
                county: c.county,
                address: c.address,
                profile_photo: c.profile_photo,
                id_front: c.id_front,
                id_back: c.id_back,
                status: c.status,
                phone_verified: c.phone_verified,
                last_login: c.last_login,
                created_at: c.created_at
            }
        });

    } catch (error) {
        console.error("Get client error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== UPDATE CLIENT ====================
router.put("/:id", verifyAdmin, async (req, res) => {
    try {
        const {
            fullname, phone, email, occupation, employer,
            monthlyIncome, county, address, status
        } = req.body;

        const [result] = await pool.query(
            `UPDATE clients SET 
                fullname = ?, phone = ?, email = ?, occupation = ?, 
                employer = ?, monthly_income = ?, county = ?, 
                address = ?, status = ?
             WHERE id = ?`,
            [
                fullname, phone, email, occupation, employer,
                monthlyIncome || 0, county, address, status || "ACTIVE",
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        res.json({ success: true, message: "Client updated successfully!" });

    } catch (error) {
        console.error("Update client error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== SUSPEND CLIENT ====================
router.put("/:id/suspend", verifyAdmin, async (req, res) => {
    try {
        // Check for active loans
        const [loans] = await pool.query(
            "SELECT COUNT(*) as count FROM loans WHERE client_id = ? AND status = 'ACTIVE' AND remaining_principal > 0",
            [req.params.id]
        );

        if (loans[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot suspend client with active loans. Please resolve all active loans first."
            });
        }

        const [result] = await pool.query(
            "UPDATE clients SET status = 'SUSPENDED' WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        res.json({ success: true, message: "Client suspended successfully!" });

    } catch (error) {
        console.error("Suspend client error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== ACTIVATE CLIENT ====================
router.put("/:id/activate", verifyAdmin, async (req, res) => {
    try {
        const [result] = await pool.query(
            "UPDATE clients SET status = 'ACTIVE' WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        res.json({ success: true, message: "Client activated successfully!" });

    } catch (error) {
        console.error("Activate client error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== DELETE CLIENT ====================
router.delete("/:id", verifyAdmin, async (req, res) => {
    try {
        // Check for loans
        const [loans] = await pool.query(
            "SELECT COUNT(*) as count FROM loans WHERE client_id = ?",
            [req.params.id]
        );

        if (loans[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete client with loan records. Please clear all loans first."
            });
        }

        const [result] = await pool.query(
            "DELETE FROM clients WHERE id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }

        res.json({ success: true, message: "Client deleted successfully!" });

    } catch (error) {
        console.error("Delete client error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;