"use client";

import MobileNav from "@/components/MobileNav";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

type Category = { id: number; name: string };

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  merchant: string | null;
  description: string | null;
  transactionDate: string;
  categoryId: number | null;
  category: { name: string; color: string } | null;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthStr: string) {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default function TransactionsClient({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [showAll, setShowAll] = useState(false);
  const [editValues, setEditValues] = useState({
    amount: "",
    merchant: "",
    description: "",
    categoryId: "",
    transactionDate: "",
  });
  const [saving, setSaving] = useState(false);

  function loadTransactions() {
    setError(false);
    setTransactions(null);
    const monthParam = showAll ? "" : `&month=${month}`;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?userId=${userId}${monthParam}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setTransactions(data))
      .catch(() => setError(true));
  }

  useEffect(() => {
    loadTransactions();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Failed to load categories:", err));
  }, [userId, month, showAll]);

  function shiftMonth(delta: number) {
    const [year, m] = month.split("-").map(Number);
    const date = new Date(year, m - 1 + delta, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    setShowAll(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}?userId=${userId}`, {
        method: "DELETE",
      });
      setTransactions((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditValues({
      amount: tx.amount.toString(),
      merchant: tx.merchant || "",
      description: tx.description || "",
      categoryId: tx.categoryId?.toString() || "",
      transactionDate: tx.transactionDate.slice(0, 10),
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: parseFloat(editValues.amount),
          merchant: editValues.merchant || null,
          description: editValues.description || null,
          categoryId: editValues.categoryId ? parseInt(editValues.categoryId, 10) : null,
          transactionDate: editValues.transactionDate,
        }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      loadTransactions();
    } catch (err) {
      console.error("Failed to update transaction:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen px-6 md:px-16 py-10">
   <nav className="flex items-center justify-between mb-10 pb-4 border-b border-ink/10">
  <span className="font-display text-xl text-ink">Ledger</span>

  <div className="hidden sm:flex items-center gap-6 font-mono text-sm text-ink/60">
    <Link href="/transactions/add" className="hover:text-ink transition-colors">
      Add Transaction
    </Link>
    <Link href="/dashboard" className="hover:text-ink transition-colors">
      Back to dashboard
    </Link>
  </div>

  <MobileNav
    links={[
      { href: "/transactions/add", label: "Add Transaction" },
      { href: "/dashboard", label: "Back to dashboard" },
    ]}
  />
</nav>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl text-ink">All transactions</h1>

          <div className="flex items-center gap-3 font-mono text-xs">
            {!showAll && (
              <>
                <button
                  onClick={() => shiftMonth(-1)}
                  className="text-ink/50 hover:text-ink transition-colors px-1"
                >
                  ←
                </button>
                <span className="text-ink w-32 text-center">{monthLabel(month)}</span>
                <button
                  onClick={() => shiftMonth(1)}
                  className="text-ink/50 hover:text-ink transition-colors px-1"
                >
                  →
                </button>
              </>
            )}
            <button
              onClick={() => setShowAll(!showAll)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                showAll ? "bg-ink text-parchment" : "bg-[#E6DCC5] text-ink/60 hover:text-ink"
              }`}
            >
              {showAll ? "Showing all" : "Show all"}
            </button>
          </div>
        </div>

        {error ? (
          <ErrorState message="Couldn't load your transactions." onRetry={loadTransactions} />
        ) : !transactions ? (
          <div className="bg-[#E6DCC5] rounded-xl divide-y divide-ink/10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <p className="font-mono text-xs text-ink/50">
            No transactions {showAll ? "yet" : `in ${monthLabel(month)}`}.
          </p>
        ) : (
          <div className="bg-[#E6DCC5] rounded-xl divide-y divide-ink/10">
            <AnimatePresence>
              {transactions.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.02 }}
                  className="px-5 py-4"
                >
                  {editingId === tx.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={editValues.amount}
                          onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                          placeholder="Amount"
                          className="font-mono text-sm bg-parchment text-ink rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-marigold"
                        />
                        <input
                          type="date"
                          value={editValues.transactionDate}
                          onChange={(e) =>
                            setEditValues({ ...editValues, transactionDate: e.target.value })
                          }
                          className="font-mono text-sm bg-parchment text-ink rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-marigold"
                        />
                        <input
                          type="text"
                          value={editValues.merchant}
                          onChange={(e) => setEditValues({ ...editValues, merchant: e.target.value })}
                          placeholder="Merchant"
                          className="font-mono text-sm bg-parchment text-ink rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-marigold"
                        />
                        {tx.type === "expense" && (
                          <select
                            value={editValues.categoryId}
                            onChange={(e) =>
                              setEditValues({ ...editValues, categoryId: e.target.value })
                            }
                            className="font-mono text-sm bg-parchment text-ink rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-marigold"
                          >
                            <option value="">No category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editValues.description}
                        onChange={(e) =>
                          setEditValues({ ...editValues, description: e.target.value })
                        }
                        placeholder="Description"
                        className="w-full font-mono text-sm bg-parchment text-ink rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-marigold"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => saveEdit(tx.id)}
                          disabled={saving}
                          className="font-mono text-xs bg-marigold text-[#412402] px-3 py-1.5 rounded-md hover:brightness-110 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-xs text-ink/50 hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {tx.category && (
                          <span
                            className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                            style={{ backgroundColor: tx.category.color }}
                          />
                        )}
                        <div>
                          <p className="font-mono text-sm text-ink">
                            {tx.merchant || tx.description || "Transaction"}
                          </p>
                          <p className="font-mono text-xs text-ink/50">
                            {new Date(tx.transactionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {tx.category ? ` · ${tx.category.name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span
                          className={`font-mono text-sm ${
                            tx.type === "income" ? "text-moss" : "text-brick/90"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {Math.abs(tx.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => startEdit(tx)}
                          className="font-mono text-xs text-ink/40 hover:text-ink transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          disabled={deletingId === tx.id}
                          className="font-mono text-xs text-ink/40 hover:text-brick transition-colors disabled:opacity-50"
                        >
                          {deletingId === tx.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}