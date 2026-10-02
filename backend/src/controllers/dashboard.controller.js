const prisma = require("../lib/prisma");
const { generateInsights } = require("../lib/gemini");

async function getSummary(req, res) {
  try {
    const { month, userId } = req.query;
    const targetMonth = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();

    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1);

    const prevMonthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);
    const prevMonthEnd = monthStart;

    // Current month transactions
    const currentTx = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: monthStart, lt: monthEnd } },
      include: { category: true },
    });

    // Previous month total (for comparison)
    const prevTx = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: prevMonthStart, lt: prevMonthEnd } },
    });

    const totalSpent = currentTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const prevTotal = prevTx
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const percentChange = prevTotal > 0 ? ((totalSpent - prevTotal) / prevTotal) * 100 : 0;

    // Category breakdown
    const categoryMap = {};
    for (const t of currentTx.filter((t) => t.type === "expense")) {
      const catName = t.category?.name || "Other";
      const catColor = t.category?.color || "#8B6F3D";
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, value: 0, color: catColor };
      }
      categoryMap[catName].value += t.amount;
    }
    const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.value - a.value);

    // Last 6 months trend
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - i, 1);
      const end = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - i + 1, 1);
      const monthTx = await prisma.transaction.findMany({
        where: { userId, transactionDate: { gte: start, lt: end } },
      });
      const total = monthTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      trend.push({
        month: start.toLocaleString("en-US", { month: "short" }),
        amount: total,
      });
    }

    res.json({
      totalSpent,
      percentChange: Math.round(percentChange * 10) / 10,
      categoryBreakdown,
      trend,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
}

async function getInsights(req, res) {
  try {
    const { month, userId } = req.query;
    const targetMonth = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();

    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1);
    const prevMonthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);

    const currentTx = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: monthStart, lt: monthEnd }, type: "expense" },
      include: { category: true },
    });
    const prevTx = await prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: prevMonthStart, lt: monthStart }, type: "expense" },
    });

    const totalSpent = currentTx.reduce((sum, t) => sum + t.amount, 0);
    const prevTotal = prevTx.reduce((sum, t) => sum + t.amount, 0);

    const categoryMap = {};
    for (const t of currentTx) {
      const catName = t.category?.name || "Other";
      categoryMap[catName] = (categoryMap[catName] || 0) + t.amount;
    }
    const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

    const insights = await generateInsights({ totalSpent, prevTotal, categoryBreakdown });
    res.json({ insights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
}

module.exports = { getSummary, getInsights };