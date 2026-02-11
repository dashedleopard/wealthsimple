"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, formatDateShort } from "@/lib/formatters";

interface ReturnChartProps {
  data: { date: string; cumulativeReturn: number; value: number }[];
  title?: string;
}

export function ReturnChart({
  data,
  title = "Cumulative Return",
}: ReturnChartProps) {
  const latestReturn = data.length > 0 ? data[data.length - 1].cumulativeReturn : 0;
  const isPositive = latestReturn >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span
            className={
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
          >
            {formatPercent(latestReturn)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No performance data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="returnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                      <p className="text-sm text-muted-foreground">{d.date}</p>
                      <p
                        className={`text-lg font-bold ${d.cumulativeReturn >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {formatPercent(d.cumulativeReturn)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeReturn"
                stroke={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                fill="url(#returnGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
