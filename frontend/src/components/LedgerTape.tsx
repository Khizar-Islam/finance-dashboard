"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  merchant: string | null;
  description: string | null;
};

const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: "s1", amount: 450, type: "expense", merchant: "Al-Fatah", description: null },
  { id: "s2", amount: 320, type: "expense", merchant: "Careem", description: null },
  { id: "s3", amount: 18060, type: "income", merchant: "Freelance payout", description: null },
];

function amountColor(type: Transaction["type"]) {
  return type === "income" ? "text-moss" : "text-brick/90";
}

export default function LedgerTape({
  variant = "onLight",
  userId,
}: {
  variant?: "onLight" | "onDark";
  userId?: string;
}) {
  const [transactions, setTransactions] = useState<Transaction[] | null>(
    userId ? null : SAMPLE_TRANSACTIONS
  );
  const isDark = variant === "onDark";

  useEffect(() => {
    if (!userId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?limit=5&userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setTransactions(data))
      .catch((err) => console.error("Failed to load transactions:", err));
  }, [userId]);

  const panelBg = isDark ? "bg-ink" : "bg-parchment";
  const textColor = isDark ? "text-parchment" : "text-ink";
  const labelColor = isDark ? "text-marigold" : "text-moss";
  const borderColor = isDark ? "border-parchment/20" : "border-ink/20";
  const perfColor = isDark ? "var(--color-parchment)" : "var(--color-ink)";

  return (
    <div className={`relative ${panelBg} rounded-sm px-5 py-6`}>
      <div
        className="absolute -top-1.5 left-0 right-0 h-3 rounded-t-2xl"
        style={{
          background: `repeating-linear-gradient(115deg, transparent 0 6px, ${perfColor} 6px 7px)`,
        }}
      />
      <p className={`font-mono text-[11px] tracking-wide ${labelColor} mb-3`}>
        RECENT ACTIVITY
      </p>
      <div className={`border-t border-dashed ${borderColor} pt-3 space-y-3`}>
        {!transactions ? (
          <p className={`font-mono text-xs ${textColor}/50`}>Loading...</p>
        ) : transactions.length === 0 ? (
          <p className={`font-mono text-xs ${textColor}/50`}>No transactions yet.</p>
        ) : (
          transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className={`flex justify-between font-mono text-sm ${textColor}`}
            >
              <span>{tx.merchant || tx.description || "Transaction"}</span>
              <span className={amountColor(tx.type)}>
                {tx.type === "income" ? "+" : "-"}
                {Math.abs(tx.amount).toLocaleString()}
              </span>
            </motion.div>
          ))
        )}
      </div>
      <div
        className="absolute -bottom-1.5 left-0 right-0 h-3 rounded-b-2xl"
        style={{
          background: `repeating-linear-gradient(115deg, transparent 0 6px, ${perfColor} 6px 7px)`,
        }}
      />
    </div>
  );
}