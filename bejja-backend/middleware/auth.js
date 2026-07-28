// ============================================
// BEJJA CREDIT - Authentication Middleware
// ============================================

const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "bejja_credit_jwt_secret_key_2024_secure";

// ==================== VERIFY TOKEN ====================
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ 
            success: false, 
            message: "Access denied. No token provided." 
        });
    }

    const token = authHeader.startsWith("Bearer ") 
        ? authHeader.slice(7) 
        : authHeader;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: "Invalid or expired token." 
        });
    }
}

// ==================== VERIFY ADMIN ====================
function verifyAdmin(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role !== "admin" && req.user.role !== "super_admin" && req.user.role !== "manager") {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied. Admin privileges required." 
            });
        }
        next();
    });
}

// ==================== VERIFY CLIENT ====================
function verifyClient(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role !== "client") {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied. Client account required." 
            });
        }
        next();
    });
}

// ==================== GENERATE TOKEN ====================
function generateToken(payload, expiresIn = "7d") {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = {
    verifyToken,
    verifyAdmin,
    verifyClient,
    generateToken
};