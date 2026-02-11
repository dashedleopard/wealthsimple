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
import { formatCurrency } from "@/lib/formatters";
import type { MonthlyDividend } from "@/types";

interface DividendChartProps {
  data: MonthlyDividend[];
  title?: string;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function DividendChart({
  data,
  title = "Monthly Dividend Income",
}: DividendChartProps) {
  const chartData = data.map((d, i) => ({
    month: MONTH_LABELS[i] ?? d.month,
    total: d.total,
  }));

  const yearTotal = data.reduce((sum, d) => sum + d.total, 0);

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
        {yearTotal === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No dividend data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
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
