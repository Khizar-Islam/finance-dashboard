const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
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

// Same rule as createTransaction: Gemini picks the category only when none is
// given and the transaction is not income. Needs req.validatedBody.
function willCallGemini(req) {
  const { categoryId, type } = req.validatedBody;
  return !categoryId && type !== "income";
}

// Only requests that will call Gemini count towards these limits.
const aiCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  skip: (req) => !willCallGemini(req),
  message: { error: "Too many AI requests, please wait a moment." },
});

const aiCreateDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 1 day
  max: 100,
  skip: (req) => !willCallGemini(req),
  message: { error: "Daily AI limit reached, please try again tomorrow." },
});

router.get("/", getTransactions);
// The AI limiters must come after validate, which sets req.validatedBody.
router.post(
  "/",
  validate(createTransactionSchema),
  aiCreateLimiter,
  aiCreateDailyLimiter,
  createTransaction
);
router.patch("/:id", validate(updateTransactionSchema), updateTransaction);
router.delete("/:id", deleteTransaction);

module.exports = router;
// Exposed for scripts/ai-limit-test.js, which resets the 15-minute counter.
module.exports.aiCreateLimiters = { aiCreateLimiter, aiCreateDailyLimiter };