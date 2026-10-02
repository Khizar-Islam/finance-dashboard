const { z } = require("zod");

const createTransactionSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  amount: z.coerce.number().positive("amount must be a positive number"),
  type: z.enum(["income", "expense"]).default("expense"),
  description: z.string().max(500).nullable().optional(),
  merchant: z.string().max(200).nullable().optional(),
  transactionDate: z.coerce.date({ error: "transactionDate must be a valid date" }),
  categoryId: z.union([z.null(), z.undefined(), z.coerce.number().int()]).optional(),
  source: z.string().max(50).optional(),
});

const updateTransactionSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  amount: z.coerce.number().positive().optional(),
  description: z.string().max(500).nullable().optional(),
  merchant: z.string().max(200).nullable().optional(),
  transactionDate: z.coerce.date().optional(),
 categoryId: z.union([z.null(), z.coerce.number().int()]).optional(),
});

const upsertBudgetSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  categoryId: z.coerce.number().int(),
  monthlyLimit: z.coerce.number().positive("monthlyLimit must be a positive number"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be in YYYY-MM format"),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

module.exports = { validate, createTransactionSchema, updateTransactionSchema, upsertBudgetSchema };