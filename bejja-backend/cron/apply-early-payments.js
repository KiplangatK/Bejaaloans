// ============================================
// BEJJA CREDIT - Auto-apply Early Payments
// Run this daily via cron/scheduler
// ============================================

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

async function applyEarlyPayments() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "bejja_credit"
    });

    const connection = await pool.getConnection();
    
    try {
        console.log("🕐 Running Early Payment Auto-Apply...");
        console.log("Date:", new Date().toISOString());
        console.log("-----------------------------------");

        // Find loans where:
        // - Status is ACTIVE
        // - Due date is TODAY or earlier
        // - Has early_payment_balance > 0
        const today = new Date().toISOString().split("T")[0];
        
        const [loans] = await connection.query(
            `SELECT id, client_id, remaining_principal, interest_rate, 
                    early_payment_balance, due_date, original_principal
             FROM loans 
             WHERE status = 'ACTIVE' 
               AND remaining_principal > 0 
               AND early_payment_balance > 0
               AND due_date <= ?`,
            [today]
        );

        if (loans.length === 0) {
            console.log("✅ No loans with early payments due today.");
            return;
        }

        console.log(`📋 Found ${loans.length} loan(s) with early payments to apply.\n`);

        for (const loan of loans) {
            const earlyBalance = Number(loan.early_payment_balance);
            const remaining = Number(loan.remaining_principal);
            const rate = Number(loan.interest_rate);
            const monthlyInterest = (remaining * rate) / 100;
            
            // Apply early payment to monthly interest first
            let appliedAmount = Math.min(earlyBalance, monthlyInterest);
            let newEarlyBalance = earlyBalance - appliedAmount;
            let newRemaining = remaining;
            let note = "";

            if (earlyBalance > monthlyInterest) {
                // Early payment covers full interest + some principal
                const extraForPrincipal = earlyBalance - monthlyInterest;
                newRemaining = remaining - extraForPrincipal;
                if (newRemaining < 0) newRemaining = 0;
                appliedAmount = earlyBalance; // All early payment used
                newEarlyBalance = 0;
                note = `Auto-applied: KSh ${monthlyInterest.toLocaleString()} interest + KSh ${extraForPrincipal.toLocaleString()} principal`;
            } else {
                // Covers partial interest
                note = `Auto-applied: KSh ${appliedAmount.toLocaleString()} toward interest`;
            }

            // Update due date to next month
            const loanDay = loan.loan_date ? new Date(loan.loan_date).getDate() : 15;
            const currentDue = new Date(loan.due_date);
            const newDueDate = new Date(currentDue.getFullYear(), currentDue.getMonth() + 1, loanDay);
            const lastDay = new Date(currentDue.getFullYear(), currentDue.getMonth() + 2, 0).getDate();
            if (loanDay > lastDay) {
                newDueDate.setDate(lastDay);
            }

            const newStatus = newRemaining <= 0 ? "COMPLETED" : "ACTIVE";
            const finalDueDate = newRemaining <= 0 ? null : newDueDate.toISOString().split("T")[0];

            await connection.beginTransaction();

            // Record payment
            await connection.query(
                `INSERT INTO payments (loan_id, client_id, amount, principal_paid, interest_paid, balance, payment_date, payment_method, note, recorded_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Auto-Apply', ?, NULL)`,
                [
                    loan.id,
                    loan.client_id,
                    appliedAmount,
                    earlyBalance > monthlyInterest ? earlyBalance - monthlyInterest : 0,
                    Math.min(earlyBalance, monthlyInterest),
                    newRemaining,
                    today,
                    note
                ]
            );

            // Update loan
            await connection.query(
                `UPDATE loans 
                 SET remaining_principal = ?,
                     early_payment_balance = ?,
                     due_date = ?,
                     total_paid = total_paid + ?,
                     status = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [newRemaining, newEarlyBalance, finalDueDate, appliedAmount, newStatus, loan.id]
            );

            await connection.commit();

            console.log(`✅ Loan #${loan.id}:`);
            console.log(`   Early Balance: KSh ${earlyBalance.toLocaleString()}`);
            console.log(`   Applied: KSh ${appliedAmount.toLocaleString()}`);
            console.log(`   Remaining Early: KSh ${newEarlyBalance.toLocaleString()}`);
            console.log(`   New Balance: KSh ${newRemaining.toLocaleString()}`);
            console.log(`   New Due Date: ${finalDueDate || "COMPLETED"}`);
            console.log(`   ${note}`);
            console.log("");
        }

        console.log("✅ Early payment auto-apply complete!");

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error:", error.message);
    } finally {
        connection.release();
        await pool.end();
    }
}

// Run
applyEarlyPayments();