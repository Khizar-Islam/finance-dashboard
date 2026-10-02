"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

type BudgetItem = {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number | null;
  spent: number;
};

function barColor(spent: number, limit: number | null) {
  if (!limit) return "bg-ink/20";
  const ratio = spent / limit;
  if (ratio >= 1) return "bg-brick";
  if (ratio >= 0.8) return "bg-marigold";
  return "bg-moss";
}

export default function BudgetsClient({ userId }: { userId: string }) {
  const [budgets, setBudgets] = useState<BudgetItem[] | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");

  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  function loadBudgets() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/budgets?month=${month}&userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setBudgets(data))
      .catch((err) => console.error("Failed to load budgets:", err));
  }

  useEffect(() => {
    loadBudgets();
  }, [userId]);

  async function saveBudget(categoryId: number) {
    if (!inputValue || parseFloat(inputValue) <= 0) return;

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/budgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        categoryId,
        monthlyLimit: parseFloat(inputValue),
        month,
      }),
    });

    setEditingId(null);
    setInputValue("");
    loadBudgets();
  }

  return (
    <main className="relative z-10 min-h-screen px-6 md:px-16 py-10">
      <nav className="flex items-center justify-between mb-10 pb-4 border-b border-ink/10">
        <span className="font-display text-xl text-ink">Ledger</span>
        <Link href="/dashboard" className="font-mono text-sm text-ink/60 hover:text-ink transition-colors">
          Back to dashboard
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl text-ink mb-2">Budgets</h1>
        <p className="font-mono text-xs text-moss mb-8">
          Set a monthly limit per category to track how close you are to it.
        </p>

        {!budgets ? (
          <p className="font-mono text-xs text-ink/50">Loading...</p>
        ) : (
          <div className="space-y-4">
            {budgets.map((b, i) => {
              const ratio = b.monthlyLimit ? Math.min((b.spent / b.monthlyLimit) * 100, 100) : 0;
              return (
                <motion.div
                  key={b.categoryId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="bg-[#E6DCC5] rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm inline-block"
                        style={{ backgroundColor: b.categoryColor }}
                      />
                      <span className="font-mono text-sm text-ink">{b.categoryName}</span>
                    </div>

                    {editingId === b.categoryId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveBudget(b.categoryId)}
                          placeholder="Rs limit"
                          className="w-24 font-mono text-xs bg-parchment text-ink rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-marigold"
                        />
                        <button
                          onClick={() => saveBudget(b.categoryId)}
                          className="font-mono text-xs text-moss hover:brightness-110"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(b.categoryId);
                          setInputValue(b.monthlyLimit?.toString() || "");
                        }}
                        className="font-mono text-xs text-ink/50 hover:text-ink transition-colors"
                      >
                        {b.monthlyLimit ? "Edit limit" : "Set limit"}
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between font-mono text-xs text-ink/60 mb-1.5">
                    <span>Rs {b.spent.toLocaleString()} spent</span>
                    <span>{b.monthlyLimit ? `of Rs ${b.monthlyLimit.toLocaleString()}` : "no limit set"}</span>
                  </div>

                  <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${barColor(b.spent, b.monthlyLimit)}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}