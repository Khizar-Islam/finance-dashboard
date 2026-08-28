const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { getSummary, getInsights } = require("../controllers/dashboard.controller");

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many AI requests, please wait a moment." },
});

router.get("/summary", getSummary);
router.get("/insights", aiLimiter, getInsights);

module.exports = router;