"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/formatters";

interface ProjectionChartProps {
  data: { month: number; p10: number; p50: number; p90: number }[];
  targetAmount: number;
  goalName: string;
}

export function ProjectionChart({
  data,
  targetAmount,
  goalName,
}: ProjectionChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Projection — {goalName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tickFormatter={(m: number) =>
                m >= 12 ? `${Math.floor(m / 12)}y` : `${m}m`
              }
              className="text-xs"
            />
            <YAxis
              tickFormatter={(v: number) => formatCompactCurrency(v)}
              className="text-xs"
              width={70}
            />
            <Tooltip
              formatter={(value: number) => formatCompactCurrency(value)}
              labelFormatter={(m: number) => `Month ${m}`}
            />
            <Area
              type="monotone"
              dataKey="p90"
              stroke="none"
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              name="Optimistic (p90)"
            />
            <Area
              type="monotone"
              dataKey="p50"
              stroke="hsl(var(--primary))"
              fill="url(#projGrad)"
              strokeWidth={2}
              name="Median (p50)"
            />
            <Area
              type="monotone"
              dataKey="p10"
              stroke="none"
              fill="hsl(var(--muted))"
              fillOpacity={0.3}
              name="Pessimistic (p10)"
            />
            <ReferenceLine
              y={targetAmount}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              label={{
                value: `Target: ${formatCompactCurrency(targetAmount)}`,
                position: "right",
                className: "text-xs fill-destructive",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
