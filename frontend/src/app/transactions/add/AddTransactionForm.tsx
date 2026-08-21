"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string };

export default function AddTransactionForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: parseFloat(amount),
          type,
          merchant: merchant || null,
          description: description || null,
          categoryId: type === "income" ? null : categoryId || undefined,
          transactionDate: date,
        }),
      });

      if (!res.ok) throw new Error("Failed to save transaction");

      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen px-6 md:px-16 py-10">
      <nav className="flex items-center justify-between mb-10 pb-4 border-b border-ink/10">
        <span className="font-display text-xl text-ink">Ledger</span>
        <button
          onClick={() => router.push("/dashboard")}
          className="font-mono text-sm text-ink/60 hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-lg mx-auto"
      >
        <h1 className="font-display text-3xl text-ink mb-8">Add transaction</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex-1 font-mono text-sm py-2.5 rounded-lg transition-all ${
                type === "expense"
                  ? "bg-brick text-parchment"
                  : "bg-[#E6DCC5] text-ink/60 hover:text-ink"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex-1 font-mono text-sm py-2.5 rounded-lg transition-all ${
                type === "income"
                  ? "bg-moss text-parchment"
                  : "bg-[#E6DCC5] text-ink/60 hover:text-ink"
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <label className="font-mono text-xs text-moss mb-1.5 block">Amount (Rs)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full font-mono text-lg bg-[#E6DCC5] text-ink rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-marigold transition-all"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-moss mb-1.5 block">Merchant</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Al-Fatah"
              className="w-full font-mono text-sm bg-[#E6DCC5] text-ink rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-marigold transition-all"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-moss mb-1.5 block">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
              className="w-full font-mono text-sm bg-[#E6DCC5] text-ink rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-marigold transition-all"
            />
          </div>

          {type === "expense" && (
            <div>
              <label className="font-mono text-xs text-moss mb-1.5 block">
                Category (leave blank to auto-categorize with AI)
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full font-mono text-sm bg-[#E6DCC5] text-ink rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-marigold transition-all"
              >
                <option value="">Auto-categorize</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="font-mono text-xs text-moss mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full font-mono text-sm bg-[#E6DCC5] text-ink rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-marigold transition-all"
            />
          </div>

          {error && <p className="font-mono text-xs text-brick">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full font-mono text-sm bg-marigold text-[#412402] px-6 py-3.5 rounded-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save transaction"}
          </button>
        </form>
      </motion.div>
    </main>
  );
}