"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, toNumber } from "@/lib/formatters";
import { ACCOUNT_TYPE_COLORS, ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { Account } from "@/types";

interface AllocationChartProps {
  accounts: Account[];
}

export function AllocationChart({ accounts }: AllocationChartProps) {
  const totalValue = accounts.reduce(
    (sum, a) => sum + toNumber(a.netliquidation),
    0
  );

  const data = accounts.map((a) => ({
    name: ACCOUNT_TYPE_LABELS[a.type] || a.type,
    value: toNumber(a.netliquidation),
    pct: totalValue > 0 ? (toNumber(a.netliquidation) / totalValue) * 100 : 0,
    color: ACCOUNT_TYPE_COLORS[a.type] || "hsl(200, 10%, 50%)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Account Allocation</span>
          <Link
            href="/allocation"
            className="text-sm font-normal text-primary hover:underline"
          >
            View All &rarr;
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No accounts found.
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-card p-2 shadow-sm">
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-sm">{formatCurrency(d.value)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(d.pct)}
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-medium">{entry.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
