const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function resetDatabase() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "bejja_credit"
    });

    try {
        console.log("🗑️  Deleting all data...\n");

        // Delete in correct order (child tables first)
        await pool.query("DELETE FROM payments");
        console.log("✅ Payments deleted");

        await pool.query("DELETE FROM loans");
        console.log("✅ Loans deleted");

        await pool.query("DELETE FROM loan_applications");
        console.log("✅ Loan applications deleted");

        await pool.query("DELETE FROM audit_logs");
        console.log("✅ Audit logs deleted");

        await pool.query("DELETE FROM sms_logs");
        console.log("✅ SMS logs deleted");

        await pool.query("DELETE FROM clients");
        console.log("✅ Clients deleted");

        // Reset auto-increment counters
        await pool.query("ALTER TABLE payments AUTO_INCREMENT = 1");
        await pool.query("ALTER TABLE loans AUTO_INCREMENT = 1");
        await pool.query("ALTER TABLE loan_applications AUTO_INCREMENT = 1");
        await pool.query("ALTER TABLE clients AUTO_INCREMENT = 1");
        console.log("✅ Auto-increment counters reset\n");

        // Keep admin - re-create if needed
        const [admins] = await pool.query("SELECT COUNT(*) as count FROM admins");
        if (admins[0].count === 0) {
            const hash = await bcrypt.hash("Admin@123", 10);
            await pool.query(
                "INSERT INTO admins (username, password, fullname, role) VALUES (?, ?, ?, ?)",
                ["Kiplangat", hash, "Kiplangat Admin", "super_admin"]
            );
            console.log("✅ Admin re-created (Kiplangat / Admin@123)");
        } else {
            console.log("✅ Admin account preserved");
        }

        console.log("\n🎉 Database reset complete!");
        console.log("\n📋 Summary:");
        
        const [clientCount] = await pool.query("SELECT COUNT(*) as count FROM clients");
        const [loanCount] = await pool.query("SELECT COUNT(*) as count FROM loans");
        const [appCount] = await pool.query("SELECT COUNT(*) as count FROM loan_applications");
        
        console.log(`   Clients: ${clientCount[0].count}`);
        console.log(`   Loans: ${loanCount[0].count}`);
        console.log(`   Applications: ${appCount[0].count}`);
        console.log("\n🔑 Admin login: Kiplangat / Admin@123");
        console.log("📱 Register new clients at: http://localhost:5000/register.html");

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await pool.end();
    }
}

resetDatabase();