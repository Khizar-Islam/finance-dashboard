const prisma = require("../lib/prisma");

// GET /api/budgets?month=2026-08&userId=...
async function getBudgets(req, res) {
  try {
    const { month, userId } = req.query;
    const monthStr = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const monthStart = new Date(`${monthStr}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

    const budgets = await prisma.budget.findMany({
      where: { userId, month: monthStart },
    });

    const transactions = await prisma.transaction.findMany({
      where: { userId, type: "expense", transactionDate: { gte: monthStart, lt: monthEnd } },
    });

    const spentByCategory = {};
    for (const t of transactions) {
      if (!t.categoryId) continue;
      spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + t.amount;
    }

    const result = categories.map((cat) => {
      const budget = budgets.find((b) => b.categoryId === cat.id);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        monthlyLimit: budget?.monthlyLimit ?? null,
        spent: spentByCategory[cat.id] || 0,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
}

// POST /api/budgets
async function upsertBudget(req, res) {
  try {
    const { userId, categoryId, monthlyLimit, month } = req.validatedBody;
    const monthDate = new Date(`${month}-01T00:00:00.000Z`);

    const existing = await prisma.budget.findFirst({
      where: { userId, categoryId, month: monthDate },
    });

    let budget;
    if (existing) {
      budget = await prisma.budget.update({
        where: { id: existing.id },
        data: { monthlyLimit },
      });
    } else {
      budget = await prisma.budget.create({
        data: { userId, categoryId, monthlyLimit, month: monthDate },
      });
    }

    res.status(200).json(budget);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save budget" });
  }
}

module.exports = { getBudgets, upsertBudget };