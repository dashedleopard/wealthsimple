"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DriftChartProps {
  data: {
    assetClass: string;
    targetPct: number;
    currentPct: number;
    driftPct: number;
    status: "within_band" | "needs_rebalance";
  }[];
}

export function DriftChart({ data }: DriftChartProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Allocation Drift</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
              className="text-xs"
            />
            <YAxis
              type="category"
              dataKey="assetClass"
              width={100}
              className="text-xs"
            />
            <Tooltip
              formatter={(value: number) =>
                `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
              }
            />
            <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="driftPct" name="Drift">
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.status === "needs_rebalance"
                      ? "hsl(var(--destructive))"
                      : "hsl(var(--primary))"
                  }
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
