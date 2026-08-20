const express = require("express");
const router = express.Router();
const { getBudgets, upsertBudget } = require("../controllers/budgets.controller");

router.get("/", getBudgets);
router.post("/", upsertBudget);

module.exports = router;