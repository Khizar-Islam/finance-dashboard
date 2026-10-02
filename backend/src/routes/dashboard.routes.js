const express = require("express");
const router = express.Router();
const { getSummary, getInsights } = require("../controllers/dashboard.controller");

router.get("/summary", getSummary);
router.get("/insights", getInsights);

module.exports = router;