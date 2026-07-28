// ============================================
// BEJJA CREDIT - Payment Processing Routes
// ============================================

const express = require("express");
const router = express.Router();
const pool = require("../db/connect");
const { verifyAdmin } = require("../middleware/auth");
const { sendPaymentConfirmationSMS } = require("../services/sms");

// ==================== GET PAYMENTS FOR A LOAN ====================
router.get("/loan/:loanId", verifyAdmin, async (req, res) => {
    try {
        const [payments] = await pool.query(
            `SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date DESC, created_at DESC`,
            [req.params.loanId]
        );
        res.json({ success: true, payments });
    } catch (error) {
        console.error("Get payments error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== GET ALL PAYMENTS ====================
router.get("/", verifyAdmin, async (req, res) => {
    try {
        const [payments] = await pool.query(
            `SELECT p.*, c.fullname, c.phone FROM payments p 
             JOIN clients c ON p.client_id = c.id 
             ORDER BY p.created_at DESC LIMIT 100`
        );
        res.json({ success: true, payments });
    } catch (error) {
        console.error("Get all payments error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== RECORD PAYMENT ====================
router.post("/", verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { loanId, amount, paymentDate, method, note, paymentType } = req.body;

        if (!loanId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Valid loan ID and amount required." });
        }

        const [loans] = await connection.query("SELECT * FROM loans WHERE id = ?", [loanId]);
        if (loans.length === 0) {
            return res.status(404).json({ success: false, message: "Loan not found." });
        }

        const loan = loans[0];
        const originalPrincipal = Number(loan.original_principal);
        const remainingPrincipal = Number(loan.remaining_principal);
        const rate = Number(loan.interest_rate);
        const earlyBalance = Number(loan.early_payment_balance || 0);
        const monthlyInterest = (originalPrincipal * rate) / 100;
        const paymentDay = paymentDate ? new Date(paymentDate) : new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const loanDay = loan.loan_date ? new Date(loan.loan_date).getDate() : 15;

        let newRemainingPrincipal = remainingPrincipal;
        let newEarlyBalance = earlyBalance;
        let newDueDate = loan.due_date ? new Date(loan.due_date) : new Date();
        let alertMessage = "";

        // ==================== EARLY PAYMENT ====================
        if (paymentType === "early") {
            // Early payment: store as credit, apply to next due payment
            newEarlyBalance = earlyBalance + amount;
            
            alertMessage = `✅ Early Payment of KSh ${amount.toLocaleString("en-KE")} recorded!\n\nTotal Early Payment Credit: KSh ${newEarlyBalance.toLocaleString("en-KE")}\n\nThis amount will be applied to your next due payment.\nOn due date (${formatDate(newDueDate)}), you'll only need to pay: KSh ${Math.max(0, monthlyInterest - newEarlyBalance).toLocaleString("en-KE")}\n\nOutstanding Balance: KSh ${newRemainingPrincipal.toLocaleString("en-KE")}`;
        }
        // ==================== PRINCIPAL PAYMENT ====================
        else if (paymentType === "principal") {
            newRemainingPrincipal = remainingPrincipal - amount;
            if (newRemainingPrincipal < 0) newRemainingPrincipal = 0;

            if (newRemainingPrincipal <= 0) {
                newDueDate = null;
                alertMessage = `🎉 LOAN FULLY PAID!\n\nPrincipal Payment: KSh ${amount.toLocaleString("en-KE")}\nOutstanding Balance: KSh 0.00`;
            } else {
                alertMessage = `✅ Principal Payment of KSh ${amount.toLocaleString("en-KE")} recorded!\n\nNew Balance: KSh ${newRemainingPrincipal.toLocaleString("en-KE")}\nNew Monthly Interest: KSh ${((newRemainingPrincipal * rate) / 100).toLocaleString("en-KE")}\nDue Date: ${newDueDate.toISOString().split("T")[0]}`;
            }
        }
        // ==================== REGULAR PAYMENT (for late loans) ====================
        else {
            const loanStartDate = new Date(loan.loan_date);
            loanStartDate.setHours(0, 0, 0, 0);
            
            let totalMonths = 0;
            let checkDate = new Date(loanStartDate);
            while (checkDate < today) {
                checkDate.setMonth(checkDate.getMonth() + 1);
                if (checkDate <= today) totalMonths++;
            }
            if (totalMonths < 1) totalMonths = 1;

            const totalExpectedInterest = monthlyInterest * totalMonths;

            const [allPayments] = await connection.query(
                "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE loan_id = ?",
                [loanId]
            );
            const totalPaidSoFar = Number(allPayments[0].total);

            const totalOwed = originalPrincipal + totalExpectedInterest;
            const remainingOwed = totalOwed - totalPaidSoFar;
            const overdue = totalExpectedInterest - totalPaidSoFar;
            const hasOverdue = overdue > 0;

            if (amount >= remainingOwed) {
                newRemainingPrincipal = 0;
                newDueDate = null;
                alertMessage = `🎉 LOAN FULLY PAID!\n\nPayment: KSh ${amount.toLocaleString("en-KE")}\nTotal Paid: KSh ${(totalPaidSoFar + amount).toLocaleString("en-KE")}\nOutstanding Balance: KSh 0.00`;
            } else if (hasOverdue && amount >= overdue) {
                const extraAmount = amount - overdue;
                newRemainingPrincipal = remainingPrincipal - extraAmount;
                if (newRemainingPrincipal < 0) newRemainingPrincipal = 0;
                
                newDueDate = new Date(paymentDay.getFullYear(), paymentDay.getMonth() + 1, loanDay);
                const lastDay = new Date(paymentDay.getFullYear(), paymentDay.getMonth() + 2, 0).getDate();
                if (loanDay > lastDay) {
                    newDueDate = new Date(paymentDay.getFullYear(), paymentDay.getMonth() + 2, 0);
                }
                
                alertMessage = `✅ Overdue CLEARED!\n\nOverdue Paid: KSh ${overdue.toLocaleString("en-KE")}\nPrincipal Paid: KSh ${extraAmount.toLocaleString("en-KE")}\nOutstanding Balance: KSh ${newRemainingPrincipal.toLocaleString("en-KE")}\nNew Due Date: ${newDueDate.toISOString().split("T")[0]}`;
            } else if (hasOverdue && amount < overdue) {
                const stillOverdue = overdue - amount;
                alertMessage = `⚠️ Partial overdue payment.\n\nPaid: KSh ${amount.toLocaleString("en-KE")}\nRemaining Overdue: KSh ${stillOverdue.toLocaleString("en-KE")}\nDue Date: ${newDueDate.toISOString().split("T")[0]} (unchanged)`;
            } else {
                newRemainingPrincipal = remainingPrincipal - amount;
                if (newRemainingPrincipal < 0) newRemainingPrincipal = 0;
                
                newDueDate = new Date(paymentDay.getFullYear(), paymentDay.getMonth() + 1, loanDay);
                const lastDay = new Date(paymentDay.getFullYear(), paymentDay.getMonth() + 2, 0).getDate();
                if (loanDay > lastDay) {
                    newDueDate = new Date(paymentDay.getFullYear(), paymentDay.getMonth() + 2, 0);
                }
                
                alertMessage = `✅ Payment recorded!\n\nPaid: KSh ${amount.toLocaleString("en-KE")}\nOutstanding Balance: KSh ${newRemainingPrincipal.toLocaleString("en-KE")}\nNew Due Date: ${newDueDate.toISOString().split("T")[0]}`;
            }
        }

        // ==================== SAVE ====================
        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO payments (loan_id, client_id, amount, balance, payment_date, payment_method, note, recorded_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [loanId, loan.client_id, amount, newRemainingPrincipal, 
             paymentDate || today.toISOString().split("T")[0], method || "Cash", note || "", req.user.id]
        );

        const newStatus = newRemainingPrincipal <= 0 ? "COMPLETED" : "ACTIVE";

        await connection.query(
            `UPDATE loans SET remaining_principal = ?, total_paid = total_paid + ?,
             early_payment_balance = ?, due_date = ?, status = ?, updated_at = NOW() WHERE id = ?`,
            [newRemainingPrincipal, amount, newEarlyBalance, 
             newDueDate ? newDueDate.toISOString().split("T")[0] : null, newStatus, loanId]
        );

        await connection.commit();

        try {
            const [client] = await pool.query("SELECT phone FROM clients WHERE id = ?", [loan.client_id]);
            if (client.length > 0) {
                await sendPaymentConfirmationSMS(client[0].phone, amount, newRemainingPrincipal);
            }
        } catch (e) { console.warn("SMS failed"); }

        res.json({
            success: true,
            message: alertMessage,
            data: {
                amountPaid: amount,
                outstandingBalance: newRemainingPrincipal,
                earlyPaymentBalance: newEarlyBalance,
                newDueDate: newDueDate ? newDueDate.toISOString().split("T")[0] : null,
                loanStatus: newStatus,
                isFullyPaid: newRemainingPrincipal <= 0
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("Payment error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    } finally {
        connection.release();
    }
});

// Helper
function formatDate(date) {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

module.exports = router;