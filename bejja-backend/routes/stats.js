// ============================================
// BEJJA CREDIT - Statistics & Analytics Routes
// ============================================

const express = require("express");
const router = express.Router();
const pool = require("../db/connect");
const { verifyAdmin } = require("../middleware/auth");

// ==================== GET DASHBOARD STATISTICS ====================
router.get("/", verifyAdmin, async (req, res) => {
    try {
        // Try using stored procedure first
        let stats;
        try {
            const [result] = await pool.query("CALL sp_get_statistics()");
            stats = result[0][0];
        } catch (procError) {
            // Fallback to direct queries if procedure doesn't exist
            console.warn("Stored procedure not found, using direct queries");
            stats = await getStatsDirect();
        }

        res.json({ success: true, stats });

    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== DIRECT STATS QUERIES (Fallback) ====================
async function getStatsDirect() {
    const [
        totalClients,
        totalLoanAmount,
        activeLoans,
        completedLoans,
        lateLoans,
        outstandingBalance,
        totalRepaid,
        pendingApplications,
        expectedInterest,
        interestCollected
    ] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM clients"),
        pool.query("SELECT COALESCE(SUM(original_principal), 0) as total FROM loans"),
        pool.query("SELECT COUNT(*) as count FROM loans WHERE status = 'ACTIVE' AND remaining_principal > 0"),
        pool.query("SELECT COUNT(*) as count FROM loans WHERE status = 'COMPLETED' OR remaining_principal <= 0"),
        pool.query("SELECT COUNT(*) as count FROM loans WHERE status = 'ACTIVE' AND remaining_principal > 0 AND due_date < CURDATE()"),
        pool.query("SELECT COALESCE(SUM(remaining_principal), 0) as total FROM loans WHERE status = 'ACTIVE' AND remaining_principal > 0"),
        pool.query("SELECT COALESCE(SUM(total_paid), 0) as total FROM loans"),
        pool.query("SELECT COUNT(*) as count FROM loan_applications WHERE status = 'PENDING'"),
        pool.query("SELECT COALESCE(SUM(original_principal * (interest_rate / 100)), 0) as total FROM loans WHERE status = 'ACTIVE' AND remaining_principal > 0"),
        pool.query("SELECT COALESCE(SUM(total_interest_paid), 0) as total FROM loans")
    ]);

    return {
        totalClients: totalClients[0][0].count,
        totalLoanAmount: totalLoanAmount[0][0].total,
        activeLoans: activeLoans[0][0].count,
        completedLoans: completedLoans[0][0].count,
        lateLoans: lateLoans[0][0].count,
        outstandingBalance: outstandingBalance[0][0].total,
        totalRepaid: totalRepaid[0][0].total,
        pendingApplications: pendingApplications[0][0].count,
        expectedInterest: expectedInterest[0][0].total,
        interestCollected: interestCollected[0][0].total
    };
}

// ==================== GET MONTHLY TRENDS ====================
router.get("/monthly-trends", verifyAdmin, async (req, res) => {
    try {
        const [disbursements] = await pool.query(
            `SELECT 
                MONTH(loan_date) as month,
                YEAR(loan_date) as year,
                SUM(original_principal) as total_disbursed,
                COUNT(*) as loan_count
             FROM loans 
             WHERE loan_date IS NOT NULL
             GROUP BY YEAR(loan_date), MONTH(loan_date)
             ORDER BY year, month`
        );

        const [collections] = await pool.query(
            `SELECT 
                MONTH(payment_date) as month,
                YEAR(payment_date) as year,
                SUM(amount) as total_collected,
                COUNT(*) as payment_count
             FROM payments 
             WHERE payment_date IS NOT NULL
             GROUP BY YEAR(payment_date), MONTH(payment_date)
             ORDER BY year, month`
        );

        res.json({
            success: true,
            disbursements,
            collections
        });

    } catch (error) {
        console.error("Get monthly trends error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== GET CLIENT GROWTH ====================
router.get("/client-growth", verifyAdmin, async (req, res) => {
    try {
        const [growth] = await pool.query(
            `SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as new_clients
             FROM clients
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month`
        );

        res.json({ success: true, growth });

    } catch (error) {
        console.error("Get client growth error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;