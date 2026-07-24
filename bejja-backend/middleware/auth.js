const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "bejja_secret";

function clientAuth(req, res, next) {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Access denied." });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== "client") return res.status(403).json({ success: false, message: "Client access required." });
        req.client = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token." });
    }
}

function adminAuth(req, res, next) {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ success: false, message: "Access denied." });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid token." });
    }
}

module.exports = { clientAuth, adminAuth };
