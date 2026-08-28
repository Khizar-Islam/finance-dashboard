const prisma = require("../lib/prisma");
const { categorizeTransaction } = require("../lib/gemini");

// GET /api/transactions?month=2026-08&categoryId=1&userId=...&limit=5
async function getTransactions(req, res) {
  try {
    const { month, categoryId, userId, limit } = req.query;
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
    const { userId, amount, type, description, merchant, transactionDate, categoryId, source } = req.validatedBody;

    let finalCategoryId = categoryId ?? null;

    if (!finalCategoryId && type !== "income") {
      const categoryName = await categorizeTransaction({ merchant, description, amount });
      const category = await prisma.category.findUnique({ where: { name: categoryName } });
      finalCategoryId = category?.id || null;
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount,
        type,
        description: description ?? null,
        merchant: merchant ?? null,
        transactionDate,
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
    const { userId, amount, description, merchant, transactionDate, categoryId } = req.validatedBody;

    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(description !== undefined && { description }),
        ...(merchant !== undefined && { merchant }),
        ...(transactionDate !== undefined && { transactionDate }),
        ...(categoryId !== undefined && { categoryId }),
      },
    });

    res.json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
}

// DELETE /api/transactions/:id?userId=...
async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: "Transaction not found" });
    }

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