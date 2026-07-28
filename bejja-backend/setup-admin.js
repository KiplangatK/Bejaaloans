const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function setupAdmin() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "bejja_credit"
    });

    try {
        const hash = await bcrypt.hash("Admin@123", 10);
        console.log("Generated hash:", hash);
        
        await pool.query("DELETE FROM admins WHERE username = 'Kiplangat'");
        await pool.query(
            "INSERT INTO admins (username, password, fullname, role) VALUES (?, ?, ?, ?)",
            ["Kiplangat", hash, "Kiplangat Admin", "super_admin"]
        );
        
        console.log("✅ Admin created! Username: Kiplangat, Password: Admin@123");
    } catch (error) {
        console.error("Error:", error.message);
    }
    await pool.end();
}

setupAdmin();