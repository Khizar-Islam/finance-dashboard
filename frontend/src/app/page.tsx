"use client";

import { motion } from "framer-motion";
import LedgerTape from "@/components/LedgerTape";
import { googleSignIn } from "./actions";

export default function Home() {
  return (
    <main className="min-h-screen bg-ink px-6 md:px-16 py-10">
      <nav className="flex items-center justify-between mb-16">
        <span className="font-display text-xl text-parchment">Ledger</span>
        <form action={googleSignIn}>
  <button
    type="submit"
    className="font-mono text-sm text-parchment/70 hover:text-parchment transition-colors"
  >
    Sign in
  </button>
</form>
      </nav>

      <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-mono text-xs tracking-widest text-moss mb-4 uppercase">
            personal finance dashboard
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.1] text-parchment mb-6">
            Watch your money move.
          </h1>
          <p className="text-parchment/70 text-base leading-relaxed mb-8 max-w-md">
            Every transaction, logged and printed in real time — spending
            patterns you can actually read, not just stare at.
          </p>
          <form action={googleSignIn}>
  <button
    type="submit"
    className="font-mono text-sm bg-marigold text-[#412402] px-6 py-3 rounded-lg hover:brightness-110 active:scale-95 transition-all"
  >
    Get started
  </button>
</form>

          <div className="flex gap-10 mt-12">
            <div>
              <p className="font-mono text-xs text-parchment/50 mb-1">this month</p>
              <p className="font-mono text-xl text-parchment">Rs 42,180</p>
            </div>
            <div>
              <p className="font-mono text-xs text-parchment/50 mb-1">vs last month</p>
              <p className="font-mono text-xl text-moss">-12%</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <LedgerTape />
        </motion.div>
      </div>
    </main>
  );
}