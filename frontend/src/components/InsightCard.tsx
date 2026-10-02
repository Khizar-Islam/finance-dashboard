"use client";

import { motion } from "framer-motion";

type Insight = {
  text: string;
  type: "trend" | "warning" | "tip";
};

const borderColor: Record<Insight["type"], string> = {
  warning: "border-l-brick",
  tip: "border-l-moss",
  trend: "border-l-marigold",
};

export default function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12 }}
      whileHover={{ y: -2 }}
      className={`bg-[#E6DCC5] border-l-4 ${borderColor[insight.type]} rounded-lg px-4 py-3`}
    >
      <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 mb-1">
        {insight.type}
      </p>
      <p className="text-sm text-ink leading-snug">{insight.text}</p>
    </motion.div>
  );
}