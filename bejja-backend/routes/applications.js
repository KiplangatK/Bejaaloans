// ============================================
// BEJJA CREDIT - Loan Application Routes
// ============================================

const express = require("express");
const router = express.Router();
const pool = require("../db/connect");
const { verifyAdmin, verifyClient } = require("../middleware/auth");
const { sendLoanApprovalSMS } = require("../services/sms");

// ==================== GET ALL APPLICATIONS (Admin) ====================
router.get("/", verifyAdmin, async (req, res) => {
    try {
        const [applications] = await pool.query(
            `SELECT 
                a.*,
                c.fullname as client_name,
                c.phone as client_phone,
                c.profile_photo as client_photo
             FROM loan_applications a
             JOIN clients c ON a.client_id = c.id
             ORDER BY a.created_at DESC`
        );

        const formatted = applications.map(a => ({
            id: a.id,
            client_id: a.client_id,
            client: {
                fullname: a.client_name,
                phone: a.client_phone,
                profile_photo: a.client_photo
            },
            amount: a.amount,
            purpose: a.purpose,
            application_date: a.application_date,
            status: a.status,
            rejection_reason: a.rejection_reason,
            reviewed_by: a.reviewed_by,
            reviewed_at: a.reviewed_at,
            guarantor1: {
                name: a.g1_name,
                id: a.g1_id,
                phone: a.g1_phone,
                relationship: a.g1_relationship,
                address: a.g1_address,
                photo: a.g1_photo,
                idFront: a.g1_id_front,
                idBack: a.g1_id_back,
                phoneVerified: a.g1_phone_verified
            },
            guarantor2: {
                name: a.g2_name,
                id: a.g2_id,
                phone: a.g2_phone,
                relationship: a.g2_relationship,
                address: a.g2_address,
                photo: a.g2_photo,
                idFront: a.g2_id_front,
                idBack: a.g2_id_back,
                phoneVerified: a.g2_phone_verified
            },
            created_at: a.created_at,
            updated_at: a.updated_at
        }));

        res.json({ success: true, applications: formatted });

    } catch (error) {
        console.error("Get applications error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== GET MY APPLICATIONS (Client) ====================
router.get("/my-applications", verifyClient, async (req, res) => {
    try {
        const [applications] = await pool.query(
            `SELECT id, amount, purpose, application_date, status, rejection_reason,
                    reviewed_at, created_at
             FROM loan_applications 
             WHERE client_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({ success: true, applications });

    } catch (error) {
        console.error("Get my applications error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== SUBMIT APPLICATION (Client) ====================
router.post("/", verifyClient, async (req, res) => {
    try {
        const { amount, purpose, guarantor1, guarantor2 } = req.body;

        if (!amount || amount < 1000) {
            return res.status(400).json({ success: false, message: "Minimum loan amount is KSh 1,000." });
        }

        if (amount > 100000) {
            return res.status(400).json({ success: false, message: "Maximum loan amount is KSh 100,000." });
        }

        if (!purpose) {
            return res.status(400).json({ success: false, message: "Loan purpose is required." });
        }

        const [pending] = await pool.query(
            "SELECT COUNT(*) as count FROM loan_applications WHERE client_id = ? AND status = 'PENDING'",
            [req.user.id]
        );

        if (pending[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending application. Please wait for it to be reviewed."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO loan_applications (
                client_id, amount, purpose,
                g1_name, g1_id, g1_phone, g1_relationship, g1_address,
                g1_photo, g1_id_front, g1_id_back, g1_phone_verified,
                g2_name, g2_id, g2_phone, g2_relationship, g2_address,
                g2_photo, g2_id_front, g2_id_back, g2_phone_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id, amount, purpose,
                guarantor1?.name || null, guarantor1?.id || null, guarantor1?.phone || null,
                guarantor1?.relationship || null, guarantor1?.address || null,
                guarantor1?.photo || null, guarantor1?.idFront || null, guarantor1?.idBack || null,
                guarantor1?.phoneVerified ? 1 : 0,
                guarantor2?.name || null, guarantor2?.id || null, guarantor2?.phone || null,
                guarantor2?.relationship || null, guarantor2?.address || null,
                guarantor2?.photo || null, guarantor2?.idFront || null, guarantor2?.idBack || null,
                guarantor2?.phoneVerified ? 1 : 0
            ]
        );

        res.status(201).json({
            success: true,
            message: "Loan application submitted successfully!",
            applicationId: result.insertId
        });

    } catch (error) {
        console.error("Submit application error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ==================== APPROVE APPLICATION (Admin) ====================
router.put("/:id/approve", verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        const { loanDate, dueDate, interestRate } = req.body;
        const applicationId = req.params.id;

        const [applications] = await connection.query(
            "SELECT * FROM loan_applications WHERE id = ? AND status = 'PENDING'",
            [applicationId]
        );

        if (applications.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Application not found or already processed." });
        }

        const app = applications[0];

        // ==================== CALCULATE DUE DATE ====================
        // Parse loan date
        const loanDateObj = loanDate ? new Date(loanDate + "T12:00:00") : new Date();
        loanDateObj.setHours(12, 0, 0, 0);
        
        let calculatedDueDate;
        if (dueDate) {
            // Admin specified a due date - use it
            calculatedDueDate = dueDate;
        } else {
            // Build date string directly to avoid timezone issues
            const loanDay = loanDateObj.getDate();
            const loanMonth = loanDateObj.getMonth(); // 0-indexed (Jan=0)
            const loanYear = loanDateObj.getFullYear();
            
            // Next month
            let dueMonth = loanMonth + 1;
            let dueYear = loanYear;
            if (dueMonth > 11) {
                dueMonth = 0;
                dueYear++;
            }
            
            // Handle months with fewer days
            const lastDayOfMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
            const dueDay = Math.min(loanDay, lastDayOfMonth);
            
            calculatedDueDate = `${dueYear}-${String(dueMonth + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
        }
        
        const finalLoanDate = loanDate || new Date().toISOString().split("T")[0];

        console.log("=== APPROVING LOAN ===");
        console.log("Loan Date:", finalLoanDate);
        console.log("Due Date:", calculatedDueDate);

        // Create loan
        const [loanResult] = await connection.query(
            `INSERT INTO loans (
                client_id, application_id, original_principal, remaining_principal,
                interest_rate, loan_date, due_date, status, approved_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
            [
                app.client_id, applicationId, app.amount, app.amount,
                interestRate || 20, finalLoanDate, calculatedDueDate, req.user.id
            ]
        );

        // Update application status
        await connection.query(
            "UPDATE loan_applications SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
            [req.user.id, applicationId]
        );

        await connection.commit();

        // Send SMS
        const [client] = await pool.query("SELECT phone FROM clients WHERE id = ?", [app.client_id]);
        if (client.length > 0) {
            await sendLoanApprovalSMS(client[0].phone, app.amount, calculatedDueDate);
        }

        res.json({
            success: true,
            message: "Loan application approved!",
            loanId: loanResult.insertId,
            dueDate: calculatedDueDate
        });

    } catch (error) {
        await connection.rollback();
        console.error("Approve application error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    } finally {
        connection.release();
    }
});

// ==================== REJECT APPLICATION (Admin) ====================
router.put("/:id/reject", verifyAdmin, async (req, res) => {
    try {
        const { reason } = req.body;

        const [result] = await pool.query(
            `UPDATE loan_applications 
             SET status = 'REJECTED', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() 
             WHERE id = ? AND status = 'PENDING'`,
            [reason || "Application rejected by admin.", req.user.id, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Application not found or already processed." });
        }

        res.json({ success: true, message: "Application rejected." });

    } catch (error) {
        console.error("Reject application error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

module.exports = router;