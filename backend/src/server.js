require("dotenv").config();
const express = require("express");
const cors = require("cors");

const transactionsRoutes = require("./routes/transactions.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const categoriesRoutes = require("./routes/categories.routes");
const budgetsRoutes = require("./routes/budgets.routes");

const app = express();

app.use(cors());
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