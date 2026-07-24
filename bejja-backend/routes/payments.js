const express = require("express");
const pool = require("../db/connect");
const { adminAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/loan/:loanId", async (req, res) => {
    try {
        const [payments] = await pool.query("SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date DESC", [req.params.loanId]);
        res.json({ success: true, payments });
    } catch (err) { res.status(500).json({ success: false, message: "Server error." }); }
});

router.post("/", adminAuth, async (req, res) => {
    try {
        const { loanId, amount, paymentDate, method } = req.body;
        const [loans] = await pool.query("SELECT * FROM loans WHERE id = ?", [loanId]);
        if (loans.length === 0) return res.json({ success: false, message: "Loan not found." });
        const loan = loans[0];
        
        let balance = Number(loan.remaining_principal);
        let rate = Number(loan.interest_rate);
        let todayDate = new Date(); todayDate.setHours(0,0,0,0);
        let monthsOverdue = 0;
        
        if (loan.due_date) {
            let dueDate = new Date(loan.due_date); dueDate.setHours(0,0,0,0);
            if (todayDate > dueDate) {
                let checkDate = new Date(dueDate);
                while (true) { checkDate.setMonth(checkDate.getMonth() + 1); if (todayDate < checkDate) break; monthsOverdue++; }
                monthsOverdue++;
            }
        }
        
        let monthlyInterest = (balance * rate) / 100;
        let totalOutstanding = monthsOverdue > 0 ? monthlyInterest * monthsOverdue : monthlyInterest;
        let interestPaid = Math.min(amount, totalOutstanding);
        let principalPaid = amount - interestPaid;
        if (principalPaid > balance) principalPaid = balance;
        let newBalance = balance - principalPaid;
        
        await pool.query("INSERT INTO payments (loan_id, amount, principal_paid, interest_paid, balance, payment_date, method) VALUES (?,?,?,?,?,?,?)", [loanId, amount, principalPaid, interestPaid, newBalance, paymentDate || new Date().toISOString().split("T")[0], method || "Cash"]);
        
        let newStatus = newBalance <= 0 ? "COMPLETED" : "ACTIVE";
        await pool.query("UPDATE loans SET remaining_principal=?, current_interest=?, status=? WHERE id=?", [newBalance, (newBalance * rate) / 100, newStatus, loanId]);
        
        const [allPayments] = await pool.query("SELECT COALESCE(SUM(interest_paid),0) as total FROM payments WHERE loan_id = ?", [loanId]);
        if (allPayments[0].total >= totalOutstanding && newBalance > 0 && newStatus !== "COMPLETED") {
            let loanDay = 15;
            if (loan.loan_date) { let p = loan.loan_date.split("-"); if (p.length === 3) loanDay = parseInt(p[2]); }
            let newDue = new Date(); newDue.setMonth(newDue.getMonth() + 1); newDue.setDate(loanDay);
            let dd = String(newDue.getDate()).padStart(2,"0"), mm = String(newDue.getMonth()+1).padStart(2,"0"), yyyy = newDue.getFullYear();
            await pool.query("UPDATE loans SET due_date=? WHERE id=?", [`${yyyy}-${mm}-${dd}`, loanId]);
        }
        
        res.json({ success: true, message: "Payment recorded." });
    } catch (err) { console.error(err); res.status(500).json({ success: false, message: "Server error." }); }
});

module.exports = router;
