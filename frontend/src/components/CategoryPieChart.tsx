"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

type CategoryItem = { name: string; value: number; color: string };

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-ink text-parchment font-mono text-xs px-3 py-2 rounded-md">
      {item.name}: Rs {item.value.toLocaleString()}
    </div>
  );
}

export default function CategoryPieChart({ data }: { data: CategoryItem[] }) {
  if (!data || data.length === 0) {
    return <p className="font-mono text-xs text-ink/50">No transactions this month.</p>;
  }

  return (
    <div className="flex items-center gap-8 h-full">
      <div className="w-[220px] h-[220px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2.5">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 font-mono text-xs text-ink/80">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}</span>
            <span className="text-ink/70 ml-1">Rs {entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}