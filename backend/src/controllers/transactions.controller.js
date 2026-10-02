const prisma = require("../lib/prisma");
const { categorizeTransaction } = require("../lib/gemini");

// GET /api/transactions?month=2026-08&categoryId=1
async function getTransactions(req, res) {
  try {
    const { month, categoryId, userId } = req.query;
    const where = {};

    if (userId) {
      where.userId = userId;
    }

    if (month) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.transactionDate = { gte: start, lt: end };
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10);
    }

    const { limit } = req.query;
const transactions = await prisma.transaction.findMany({
  where,
  include: { category: true },
  orderBy: { transactionDate: "desc" },
  ...(limit && { take: parseInt(limit, 10) }),
});

    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
}

// POST /api/transactions
async function createTransaction(req, res) {
  try {
    const { userId, amount, type, description, merchant, transactionDate, categoryId, source } = req.body;

    if (!userId || !amount || !transactionDate) {
      return res.status(400).json({ error: "userId, amount, and transactionDate are required" });
    }

    let finalCategoryId = categoryId ? parseInt(categoryId, 10) : null;

    // Auto-categorize only for expenses without a manually chosen category
    if (!finalCategoryId && type !== "income") {
      const categoryName = await categorizeTransaction({ merchant, description, amount });
      const category = await prisma.category.findUnique({ where: { name: categoryName } });
      finalCategoryId = category?.id || null;
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: parseFloat(amount),
        type: type === "income" ? "income" : "expense",
        description,
        merchant,
        transactionDate: new Date(transactionDate),
        categoryId: finalCategoryId,
        source: source || "manual",
      },
    });

    res.status(201).json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
}

// PATCH /api/transactions/:id
async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const { amount, description, merchant, transactionDate, categoryId } = req.body;

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description }),
        ...(merchant !== undefined && { merchant }),
        ...(transactionDate !== undefined && { transactionDate: new Date(transactionDate) }),
        ...(categoryId !== undefined && { categoryId: parseInt(categoryId, 10) }),
      },
    });

    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
}

// DELETE /api/transactions/:id
async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
}

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};