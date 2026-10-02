"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type TrendItem = { month: string; amount: number };

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-parchment font-mono text-xs px-3 py-2 rounded-md">
      {label}: Rs {payload[0].value.toLocaleString()}
    </div>
  );
}

export default function SpendingTrendChart({ data }: { data: TrendItem[] }) {
  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#132119" strokeOpacity={0.08} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontFamily: "monospace", fontSize: 11, fill: "#132119AA" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: "monospace", fontSize: 11, fill: "#132119AA" }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#A6402E"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#A6402E", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}