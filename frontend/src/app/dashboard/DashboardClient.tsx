"use client";

import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import Link from "next/link";
import LedgerTape from "@/components/LedgerTape";
import CategoryPieChart from "@/components/CategoryPieChart";
import SpendingTrendChart from "@/components/SpendingTrendChart";
import InsightCard from "@/components/InsightCard";
import { logOut } from "../actions";

type CategoryItem = { name: string; value: number; color: string };
type TrendItem = { month: string; amount: number };
type Summary = {
  totalSpent: number;
  percentChange: number;
  categoryBreakdown: CategoryItem[];
  trend: TrendItem[];
};
type Insight = { text: string; type: "trend" | "warning" | "tip" };

function ChartsPanel({ summary }: { summary: Summary | null }) {
  const [view, setView] = useState<"category" | "trend">("category");

  return (
    <div className="md:col-span-2 bg-[#E6DCC5] rounded-xl p-5 min-h-[320px]">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView("category")}
          className={`font-mono text-xs px-3 py-1.5 rounded-md transition-colors ${
            view === "category" ? "bg-ink text-parchment" : "text-ink/50 hover:text-ink"
          }`}
        >
          By Category
        </button>
        <button
          onClick={() => setView("trend")}
          className={`font-mono text-xs px-3 py-1.5 rounded-md transition-colors ${
            view === "trend" ? "bg-ink text-parchment" : "text-ink/50 hover:text-ink"
          }`}
        >
          Trend
        </button>
      </div>
      {!summary ? (
        <p className="font-mono text-xs text-ink/50">Loading...</p>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {view === "category" ? (
              <CategoryPieChart data={summary.categoryBreakdown} />
            ) : (
              <SpendingTrendChart data={summary.trend} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default function DashboardClient({ userId }: { userId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insights, setInsights] = useState<Insight[] | null>(null);

  useEffect(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/summary?month=${month}&userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error("Failed to load summary:", err));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/insights?month=${month}&userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setInsights(data.insights))
      .catch((err) => console.error("Failed to load insights:", err));
  }, [userId]);

  const isPositiveTrend = (summary?.percentChange ?? 0) <= 0;

  return (
    <main className="relative z-10 min-h-screen px-6 md:px-16 py-10">
      <nav className="flex items-center justify-between mb-10 pb-4 border-b border-ink/10">
        <span className="font-display text-xl text-ink">Ledger</span>
        <div className="flex items-center gap-6 font-mono text-sm text-ink/60">
          <Link href="/transactions" className="hover:text-ink transition-colors">
            Transactions
          </Link>
          <Link href="/transactions/add" className="hover:text-ink transition-colors">
            Add Transaction
          </Link>
          <Link href="/budgets" className="hover:text-ink transition-colors">
            Budgets
          </Link>
          <form action={logOut}>
            <button type="submit" className="hover:text-brick transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#E6DCC5] rounded-xl p-5"
        >
          <p className="font-mono text-xs text-moss mb-2">total spent this month</p>
          <p className="font-mono text-2xl text-ink">
            Rs{" "}
            {summary ? (
              <CountUp end={summary.totalSpent} duration={1.2} separator="," />
            ) : (
              "..."
            )}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[#E6DCC5] rounded-xl p-5"
        >
          <p className="font-mono text-xs text-moss mb-2">categories this month</p>
          <p className="font-mono text-2xl text-marigold">
            {summary ? summary.categoryBreakdown.length : "..."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-[#E6DCC5] rounded-xl p-5"
        >
          <p className="font-mono text-xs text-moss mb-2">vs last month</p>
          <p className={`font-mono text-2xl ${isPositiveTrend ? "text-moss" : "text-brick"}`}>
            {summary ? (
              <>
                {summary.percentChange > 0 ? "+" : ""}
                <CountUp end={summary.percentChange} duration={1.2} decimals={1} />%
              </>
            ) : (
              "..."
            )}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartsPanel summary={summary} />
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <LedgerTape variant="onDark" userId={userId} />
        </motion.div>
      </div>

      {insights && insights.length > 0 && (
        <div className="mt-8">
          <p className="font-mono text-xs text-moss mb-3">AI INSIGHTS</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}