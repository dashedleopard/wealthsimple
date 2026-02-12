"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, formatDateShort } from "@/lib/formatters";
import type { BenchmarkComparison } from "@/types";

interface BenchmarkChartProps {
  data: BenchmarkComparison[];
  title?: string;
}

export function BenchmarkChart({
  data,
  title = "Portfolio vs Benchmarks",
}: BenchmarkChartProps) {
  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {latest && (
            <div className="flex gap-4 text-sm font-normal">
              <span className="text-blue-600">
                Portfolio: {formatPercent(latest.portfolioReturn)}
              </span>
              <span className="text-emerald-600">
                S&amp;P/TSX: {formatPercent(latest.spTsxReturn)}
              </span>
              <span className="text-orange-500">
                S&amp;P 500: {formatPercent(latest.sp500Return)}
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[350px] items-center justify-center text-muted-foreground">
            No benchmark data available. Run sync to populate portfolio data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateShort}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                width={60}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as BenchmarkComparison;
                  if (!d) return null;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                      <p className="mb-1 text-sm text-muted-foreground">
                        {d.date}
                      </p>
                      <p className="text-sm text-blue-600">
                        Portfolio: {formatPercent(d.portfolioReturn)}
                      </p>
                      <p className="text-sm text-emerald-600">
                        S&P/TSX: {formatPercent(d.spTsxReturn)}
                      </p>
                      <p className="text-sm text-orange-500">
                        S&P 500: {formatPercent(d.sp500Return)}
                      </p>
                    </div>
                  );
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="portfolioReturn"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2}
                dot={false}
                name="Portfolio"
              />
              <Line
                type="monotone"
                dataKey="spTsxReturn"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name="S&P/TSX"
              />
              <Line
                type="monotone"
                dataKey="sp500Return"
                stroke="hsl(24, 95%, 53%)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                name="S&P 500"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
