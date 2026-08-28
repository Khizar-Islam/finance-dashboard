"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  merchant: string | null;
  description: string | null;
  transactionDate: string;
  category: { name: string; color: string } | null;
};

export default function TransactionsClient({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadTransactions() {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setTransactions(data))
      .catch((err) => console.error("Failed to load transactions:", err));
  }

  useEffect(() => {
    loadTransactions();
  }, [userId]);

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

  return (
    <main className="relative z-10 min-h-screen px-6 md:px-16 py-10">
      <nav className="flex items-center justify-between mb-10 pb-4 border-b border-ink/10">
        <span className="font-display text-xl text-ink">Ledger</span>
        <div className="flex items-center gap-6 font-mono text-sm text-ink/60">
          <Link href="/transactions/add" className="hover:text-ink transition-colors">
            Add Transaction
          </Link>
          <Link href="/dashboard" className="hover:text-ink transition-colors">
            Back to dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl text-ink mb-8">All transactions</h1>

        {!transactions ? (
          <p className="font-mono text-xs text-ink/50">Loading...</p>
        ) : transactions.length === 0 ? (
          <p className="font-mono text-xs text-ink/50">No transactions yet.</p>
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
                  className="flex items-center justify-between px-5 py-4"
                >
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
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      className="font-mono text-xs text-ink/40 hover:text-brick transition-colors disabled:opacity-50"
                    >
                      {deletingId === tx.id ? "..." : "Delete"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}