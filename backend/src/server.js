require("dotenv").config();
const express = require("express");
const cors = require("cors");

const transactionsRoutes = require("./routes/transactions.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const categoriesRoutes = require("./routes/categories.routes");
const budgetsRoutes = require("./routes/budgets.routes");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("./middleware/auth");
const { apiNotFound, errorHandler } = require("./middleware/errorHandler");
const { buildAllowedOrigins } = require("./lib/corsOrigins");
const { parseTrustProxyHops } = require("./lib/trustProxy");

const app = express();

// req.ip (used by the rate limiters) is the real visitor only when Express
// trusts the proxies in front of it. Must be set before any limiter runs.
const trustProxyHops = parseTrustProxyHops(process.env.TRUST_PROXY_HOPS);
if (trustProxyHops > 0) app.set("trust proxy", trustProxyHops);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: "Too many requests, please try again later." },
});

app.use(generalLimiter);

// The frontend runs on a different domain, so the API must name the sites
// allowed to call it. CORS_ORIGINS (comma-separated) can add more.
const allowedOrigins = buildAllowedOrigins(process.env.CORS_ORIGINS);

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json({ limit: "100kb" }));

// Every /api route requires a valid token; the user id comes only from it.
app.use("/api", requireAuth);

app.use("/api/transactions", transactionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/budgets", budgetsRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Finance Dashboard API is running" });
});

// Must come after every router.
app.use("/api", apiNotFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  console.log(`Trust proxy hops: ${trustProxyHops}${trustProxyHops === 0 ? " (off)" : ""}`);
  if (process.env.RENDER === "true" && trustProxyHops === 0) {
    console.warn("Warning: running on Render with trust proxy off; set TRUST_PROXY_HOPS=3 or all visitors share one rate-limit counter.");
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;