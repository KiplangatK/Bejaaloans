const express = require("express");
const pool = require("../db/connect");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", adminAuth, async (req, res) => {
    try {
        const [[{ totalClients }]] = await pool.query("SELECT COUNT(*) as totalClients FROM clients");
        const [[{ activeLoans }]] = await pool.query("SELECT COUNT(*) as activeLoans FROM loans WHERE status='ACTIVE' AND remaining_principal > 0 AND due_date >= CURDATE()");
        const [[{ lateLoans }]] = await pool.query("SELECT COUNT(*) as lateLoans FROM loans WHERE status='ACTIVE' AND remaining_principal > 0 AND due_date < CURDATE()");
        const [[{ completedLoans }]] = await pool.query("SELECT COUNT(*) as completedLoans FROM loans WHERE status='COMPLETED' OR remaining_principal <= 0");
        const [[{ pendingApplications }]] = await pool.query("SELECT COUNT(*) as pendingApplications FROM loan_applications WHERE status='PENDING'");
        const [[{ totalLoanAmount }]] = await pool.query("SELECT COALESCE(SUM(original_principal),0) as totalLoanAmount FROM loans");
        const [[{ outstandingBalance }]] = await pool.query("SELECT COALESCE(SUM(remaining_principal),0) as outstandingBalance FROM loans WHERE status='ACTIVE'");
        const [[{ totalRepaid }]] = await pool.query("SELECT COALESCE(SUM(principal_paid + interest_paid),0) as totalRepaid FROM payments");
        const [[{ interestCollected }]] = await pool.query("SELECT COALESCE(SUM(interest_paid),0) as interestCollected FROM payments");
        const [[{ expectedInterest }]] = await pool.query("SELECT COALESCE(SUM((remaining_principal * interest_rate)/100),0) as expectedInterest FROM loans WHERE status='ACTIVE' AND remaining_principal > 0");

        res.json({ success: true, stats: { totalClients, activeLoans, lateLoans, completedLoans, pendingApplications, totalLoanAmount, outstandingBalance, totalRepaid, interestCollected, expectedInterest } });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

module.exports = router;
