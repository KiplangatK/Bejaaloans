const express = require("express");
const pool = require("../db/connect");
const { adminAuth, clientAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", adminAuth, async (req, res) => {
    try {
        const [applications] = await pool.query("SELECT * FROM loan_applications ORDER BY application_date DESC");
        for (let app of applications) {
            const [guarantors] = await pool.query("SELECT * FROM guarantors WHERE application_id = ?", [app.id]);
            app.guarantor1 = guarantors.find(g => g.guarantor_number === "1") || null;
            app.guarantor2 = guarantors.find(g => g.guarantor_number === "2") || null;
            const [client] = await pool.query("SELECT fullname, phone, national_id, profile_photo FROM clients WHERE id = ?", [app.client_id]);
            app.client = client[0] || {};
        }
        res.json({ success: true, applications });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.post("/", clientAuth, async (req, res) => {
    try {
        const { amount, purpose, guarantor1, guarantor2 } = req.body;
        const [result] = await pool.query("INSERT INTO loan_applications (client_id, amount, purpose, status, application_date) VALUES (?, ?, ?, 'PENDING', CURDATE())", [req.client.id, amount, purpose]);
        const appId = result.insertId;
        if (guarantor1) await pool.query("INSERT INTO guarantors (application_id, name, national_id, phone, relationship, address, photo, id_front, id_back, guarantor_number) VALUES (?,?,?,?,?,?,?,?,?,'1')", [appId, guarantor1.name, guarantor1.id, guarantor1.phone, guarantor1.relationship, guarantor1.address, guarantor1.photo, guarantor1.idFront, guarantor1.idBack]);
        if (guarantor2) await pool.query("INSERT INTO guarantors (application_id, name, national_id, phone, relationship, address, photo, id_front, id_back, guarantor_number) VALUES (?,?,?,?,?,?,?,?,?,'2')", [appId, guarantor2.name, guarantor2.id, guarantor2.phone, guarantor2.relationship, guarantor2.address, guarantor2.photo, guarantor2.idFront, guarantor2.idBack]);
        res.json({ success: true, message: "Application submitted.", applicationId: appId });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.put("/:id/approve", adminAuth, async (req, res) => {
    try {
        const { loanDate, dueDate } = req.body;
        const [app] = await pool.query("SELECT * FROM loan_applications WHERE id = ?", [req.params.id]);
        if (app.length === 0) return res.json({ success: false, message: "Application not found." });
        const application = app[0];
        await pool.query("UPDATE loan_applications SET status='APPROVED' WHERE id=?", [req.params.id]);
        await pool.query("INSERT INTO loans (client_id, application_id, original_principal, remaining_principal, purpose, interest_rate, current_interest, loan_date, due_date, approved_by, status, created_at) VALUES (?,?,?,?,?,20,?,?,?,?,'ACTIVE',CURDATE())", [application.client_id, application.id, application.amount, application.amount, application.purpose, application.amount * 0.20, loanDate || new Date().toISOString().split("T")[0], dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0], req.admin.username]);
        res.json({ success: true, message: "Loan approved." });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.put("/:id/reject", adminAuth, async (req, res) => {
    try { await pool.query("UPDATE loan_applications SET status='REJECTED' WHERE id=?", [req.params.id]); res.json({ success: true, message: "Application rejected." }); }
    catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

module.exports = router;
