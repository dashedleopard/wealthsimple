"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { AllocationSlice } from "@/types";

interface DonutChartProps {
  data: AllocationSlice[];
  centerLabel?: string;
}

export function DonutChart({ data, centerLabel }: DonutChartProps) {
  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <ResponsiveContainer width={220} height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              dataKey="marketValue"
              nameKey="name"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as AllocationSlice;
                return (
                  <div className="rounded-lg border bg-card p-2 shadow-sm">
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-sm">{formatCurrency(d.marketValue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(d.percentage)} · {d.count} position
                      {d.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold">{centerLabel}</span>
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="max-w-[150px] truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                {formatCurrency(entry.marketValue)}
              </span>
              <span className="w-14 text-right font-medium">
                {entry.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
