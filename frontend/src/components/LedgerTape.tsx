"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Skeleton } from "./Skeleton";
import { ErrorState } from "./ErrorState";

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
  const [error, setError] = useState(false);
  const isDark = variant === "onDark";

  function load() {
    if (!userId) return;
    setError(false);
    setTransactions(null);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions?limit=5&userId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setTransactions(data))
      .catch(() => setError(true));
  }

  useEffect(() => {
    load();
  }, [userId]);

  const panelBg = isDark ? "bg-ink" : "bg-parchment";
  const textColor = isDark ? "text-parchment" : "text-ink";
  const labelColor = isDark ? "text-marigold" : "text-moss";
  const borderColor = isDark ? "border-parchment/20" : "border-ink/20";
  const perfColor = isDark ? "var(--color-parchment)" : "var(--color-ink)";
  const skeletonColor = isDark ? "bg-parchment/10" : "bg-ink/10";

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
        {error ? (
          <ErrorState message="Couldn't load recent activity." onRetry={load} />
        ) : !transactions ? (
          <>
            <Skeleton className={`h-4 w-full ${skeletonColor}`} />
            <Skeleton className={`h-4 w-4/5 ${skeletonColor}`} />
            <Skeleton className={`h-4 w-3/5 ${skeletonColor}`} />
          </>
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