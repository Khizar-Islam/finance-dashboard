"use client";

import MobileNav from "@/components/MobileNav";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import Link from "next/link";
import LedgerTape from "@/components/LedgerTape";
import CategoryPieChart from "@/components/CategoryPieChart";
import SpendingTrendChart from "@/components/SpendingTrendChart";
import InsightCard from "@/components/InsightCard";
import { Skeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";
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

function ChartsPanel({
  summary,
  error,
  onRetry,
}: {
  summary: Summary | null;
  error: boolean;
  onRetry: () => void;
}) {
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
      {error ? (
        <ErrorState message="Couldn't load your spending data." onRetry={onRetry} />
      ) : !summary ? (
        <div className="flex items-center gap-8">
          <Skeleton className="w-[220px] h-[220px] rounded-full" />
          <div className="space-y-2.5 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
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
  const [summaryError, setSummaryError] = useState(false);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsError, setInsightsError] = useState(false);

  function loadSummary() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSummaryError(false);
    setSummary(null);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/summary?month=${month}&userId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setSummary(data))
      .catch(() => setSummaryError(true));
  }

  function loadInsights() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setInsightsError(false);
    setInsights(null);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/insights?month=${month}&userId=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setInsights(data.insights))
      .catch(() => setInsightsError(true));
  }

  useEffect(() => {
    loadSummary();
    loadInsights();
  }, [userId]);

  const isPositiveTrend = (summary?.percentChange ?? 0) <= 0;

  return (
    <main className="relative z-10 min-h-screen px-6 md:px-16 py-10">
    <nav className="flex items-center justify-between mb-10 pb-4 border-b border-ink/10">
  <span className="font-display text-xl text-ink">Ledger</span>

  <div className="hidden sm:flex items-center gap-6 font-mono text-sm text-ink/60">
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

  <MobileNav
    links={[
      { href: "/transactions", label: "Transactions" },
      { href: "/transactions/add", label: "Add Transaction" },
      { href: "/budgets", label: "Budgets" },
    ]}
    onSignOut={() => logOut()}
  />
</nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#E6DCC5] rounded-xl p-5"
        >
          <p className="font-mono text-xs text-moss mb-2">total spent this month</p>
          {summaryError ? (
            <p className="font-mono text-sm text-brick">—</p>
          ) : !summary ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="font-mono text-2xl text-ink">
              Rs <CountUp end={summary.totalSpent} duration={1.2} separator="," />
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-[#E6DCC5] rounded-xl p-5"
        >
          <p className="font-mono text-xs text-moss mb-2">categories this month</p>
          {summaryError ? (
            <p className="font-mono text-sm text-brick">—</p>
          ) : !summary ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="font-mono text-2xl text-marigold">{summary.categoryBreakdown.length}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-[#E6DCC5] rounded-xl p-5"
        >
          <p className="font-mono text-xs text-moss mb-2">vs last month</p>
          {summaryError ? (
            <p className="font-mono text-sm text-brick">—</p>
          ) : !summary ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className={`font-mono text-2xl ${isPositiveTrend ? "text-moss" : "text-brick"}`}>
              {summary.percentChange > 0 ? "+" : ""}
              <CountUp end={summary.percentChange} duration={1.2} decimals={1} />%
            </p>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartsPanel summary={summary} error={summaryError} onRetry={loadSummary} />
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <LedgerTape variant="onDark" userId={userId} />
        </motion.div>
      </div>

      <div className="mt-8">
        <p className="font-mono text-xs text-moss mb-3">AI INSIGHTS</p>
        {insightsError ? (
          <ErrorState message="Couldn't load AI insights." onRetry={loadInsights} />
        ) : !insights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}