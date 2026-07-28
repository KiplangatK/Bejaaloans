// ============================================
// BEJJA LOAN CREDIT - Main Server
// ============================================

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/clients");
const applicationRoutes = require("./routes/applications");
const loanRoutes = require("./routes/loans");
const paymentRoutes = require("./routes/payments");
const statsRoutes = require("./routes/stats");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.options("*", cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/stats", statsRoutes);

app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "Bejja Credit API is running" });
});

app.use(express.static(path.join(__dirname, "..")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

module.exports = app;