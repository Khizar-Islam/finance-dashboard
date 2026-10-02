require("dotenv").config();
const express = require("express");
const cors = require("cors");

const transactionsRoutes = require("./routes/transactions.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const categoriesRoutes = require("./routes/categories.routes");
const budgetsRoutes = require("./routes/budgets.routes");
const rateLimit = require("express-rate-limit");

const app = express();

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: "Too many requests, please try again later." },
});

app.use(generalLimiter);

const allowedOrigins = [
  "http://localhost:3000",
  "https://finance-dashboard-khizar9.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());

app.use("/api/transactions", transactionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/budgets", budgetsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Finance Dashboard API is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});