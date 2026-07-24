
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/clients", require("./routes/clients"));
app.use("/api/applications", require("./routes/applications"));
app.use("/api/loans", require("./routes/loans"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/stats", require("./routes/stats"));

app.get("/", (req, res) => res.json({ message: "Bejja Loan Credit API", version: "1.0.0" }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
