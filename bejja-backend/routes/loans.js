// ============================================
// BEJJA CREDIT - Loan Management Routes
// ============================================

const express = require("express");
const router = express.Router();
const pool = require("../db/connect");
const { verifyAdmin, verifyClient } = require("../middleware/auth");

// ==================== GET ALL LOANS (Admin) ====================
router.get("/", verifyAdmin, async (req, res) => {
    try {
        const [loans] = await pool.query(
            `SELECT l.*, c.fullname, c.phone, c.profile_photo, c.national_id
             FROM loans l
             JOIN clients c ON l.client_id = c.id
             ORDER BY l.created_at DESC`
        );

        const formatted = loans.map(l => ({
            id: l.id,
            client_id: l.client_id,
            application_id: l.application_id,
            fullname: l.fullname,
            phone: l.phone,
            profile_photo: l.profile_photo,
            national_id: l.national_id,
            original_principal: l.original_principal,
            remaining_principal: l.remaining_principal,
            interest_rate: l.interest_rate,
            loan_date: l.loan_date,
            due_date: l.due_date,
            status: l.status,
            approved_by: l.approved_by,
            total_paid: l.total_paid,
            total_interest_paid: l.total_interest_paid,
            early_payment_balance: l.early_payment_balance,
            created_at: l.created_at,
            updated_at: l.updated_at
        }));

        res.json({ success: true, loans: formatted });

    } catch (error) {
        console.error("Get loans error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== GET MY LOANS (Client) ====================
router.get("/my-loans", verifyClient, async (req, res) => {
    try {
        const [loans] = await pool.query(
            `SELECT id, application_id, original_principal, remaining_principal,
                    interest_rate, loan_date, due_date, status, total_paid,
                    total_interest_paid, early_payment_balance, created_at, updated_at
             FROM loans 
             WHERE client_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({ success: true, loans });

    } catch (error) {
        console.error("Get my loans error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== GET SINGLE LOAN ====================
router.get("/:id", verifyAdmin, async (req, res) => {
    try {
        const [loans] = await pool.query(
            `SELECT l.*, c.fullname, c.phone, c.profile_photo
             FROM loans l
             JOIN clients c ON l.client_id = c.id
             WHERE l.id = ?`,
            [req.params.id]
        );

        if (loans.length === 0) {
            return res.status(404).json({ success: false, message: "Loan not found." });
        }

        const l = loans[0];
        res.json({
            success: true,
            loan: {
                id: l.id,
                client_id: l.client_id,
                fullname: l.fullname,
                phone: l.phone,
                profile_photo: l.profile_photo,
                original_principal: l.original_principal,
                remaining_principal: l.remaining_principal,
                interest_rate: l.interest_rate,
                loan_date: l.loan_date,
                due_date: l.due_date,
                status: l.status,
                total_paid: l.total_paid,
                total_interest_paid: l.total_interest_paid,
                early_payment_balance: l.early_payment_balance,
                created_at: l.created_at,
                updated_at: l.updated_at
            }
        });

    } catch (error) {
        console.error("Get loan error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== APPLY EARLY PAYMENTS (Manual Trigger) ====================
router.post("/apply-early-payments", verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const today = new Date().toISOString().split("T")[0];
        
        const [loans] = await connection.query(
            `SELECT * FROM loans 
             WHERE status = 'ACTIVE' 
               AND remaining_principal > 0 
               AND early_payment_balance > 0
               AND due_date <= ?`,
            [today]
        );

        if (loans.length === 0) {
            connection.release();
            return res.json({ success: true, message: "No loans with early payments due today." });
        }

        let applied = 0;

        for (const loan of loans) {
            const earlyBalance = Number(loan.early_payment_balance);
            const remaining = Number(loan.remaining_principal);
            const rate = Number(loan.interest_rate);
            const monthlyInterest = (remaining * rate) / 100;
            
            let appliedAmount = 0;
            let interestPaid = 0;
            let principalPaid = 0;
            let newEarlyBalance = earlyBalance;
            let newRemaining = remaining;

            if (earlyBalance >= monthlyInterest) {
                interestPaid = monthlyInterest;
                const remainingEarly = earlyBalance - monthlyInterest;
                
                if (remainingEarly > 0) {
                    principalPaid = Math.min(remainingEarly, remaining);
                    newRemaining = remaining - principalPaid;
                    if (newRemaining < 0) newRemaining = 0;
                }
                
                appliedAmount = interestPaid + principalPaid;
                newEarlyBalance = 0;
            } else {
                interestPaid = earlyBalance;
                appliedAmount = earlyBalance;
                newEarlyBalance = 0;
            }

            const loanDay = loan.loan_date ? new Date(loan.loan_date + "T12:00:00").getDate() : 15;
            const currentDue = new Date(loan.due_date + "T12:00:00");
            const newDueDate = new Date(currentDue.getFullYear(), currentDue.getMonth() + 1, 1);
            const lastDay = new Date(currentDue.getFullYear(), currentDue.getMonth() + 2, 0).getDate();
            newDueDate.setDate(Math.min(loanDay, lastDay));

            const newStatus = newRemaining <= 0 ? "COMPLETED" : "ACTIVE";
            const finalDueDate = newRemaining <= 0 ? null : newDueDate.toISOString().split("T")[0];
            const note = `Auto-applied: KSh ${interestPaid.toLocaleString()} interest + KSh ${principalPaid.toLocaleString()} principal`;

            await connection.beginTransaction();

            await connection.query(
                `INSERT INTO payments (loan_id, client_id, amount, principal_paid, interest_paid, balance, payment_date, payment_method, note, recorded_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Auto-Apply', ?, ?)`,
                [loan.id, loan.client_id, appliedAmount, principalPaid, interestPaid, newRemaining, today, note, req.user.id]
            );

            await connection.query(
                `UPDATE loans 
                 SET remaining_principal = ?, early_payment_balance = ?, due_date = ?,
                     total_paid = total_paid + ?, total_interest_paid = total_interest_paid + ?,
                     status = ?, updated_at = NOW()
                 WHERE id = ?`,
                [newRemaining, newEarlyBalance, finalDueDate, appliedAmount, interestPaid, newStatus, loan.id]
            );

            await connection.commit();
            applied++;
        }

        connection.release();
        res.json({ success: true, message: `✅ Applied early payments for ${applied} loan(s).` });

    } catch (error) {
        await connection.rollback();
        console.error("Apply early payments error:", error);
        connection.release();
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;