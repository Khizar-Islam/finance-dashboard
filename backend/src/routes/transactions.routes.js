const express = require("express");
const router = express.Router();
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactions.controller");
const {
  validate,
  createTransactionSchema,
  updateTransactionSchema,
} = require("../lib/validation");

router.get("/", getTransactions);
router.post("/", validate(createTransactionSchema), createTransaction);
router.patch("/:id", validate(updateTransactionSchema), updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;