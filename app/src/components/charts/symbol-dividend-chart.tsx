"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateShort } from "@/lib/formatters";

interface SymbolDividendChartProps {
  data: { date: string; amount: number; accountType: string }[];
  title?: string;
}

export function SymbolDividendChart({
  data,
  title = "Dividend History",
}: SymbolDividendChartProps) {
  // Aggregate by month
  const byMonth = new Map<string, number>();
  for (const d of data) {
    const monthKey = d.date.slice(0, 7);
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + d.amount);
  }

  const chartData = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));

  const yearTotal = chartData.reduce((sum, d) => sum + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">
            Total: {formatCurrency(yearTotal)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No dividend history.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="month"
                tickFormatter={(v) => formatDateShort(new Date(v + "-15"))}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                width={70}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                      <p className="text-sm text-muted-foreground">
                        {payload[0].payload.month}
                      </p>
                      <p className="text-lg font-bold text-emerald-600">
                        {formatCurrency(payload[0].value as number)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="total"
                fill="hsl(142, 76%, 36%)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
