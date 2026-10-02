const express = require("express");
const router = express.Router();
const { getBudgets, upsertBudget } = require("../controllers/budgets.controller");
const { validate, upsertBudgetSchema } = require("../lib/validation");

router.get("/", getBudgets);
router.post("/", validate(upsertBudgetSchema), upsertBudget);

module.exports = router;