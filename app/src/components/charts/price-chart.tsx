"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import type { HistoricalPrice } from "@/types";

interface PriceChartProps {
  data: HistoricalPrice[];
  entryPrice?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  title?: string;
}

export function PriceChart({
  data,
  entryPrice,
  fiftyTwoWeekHigh,
  fiftyTwoWeekLow,
  title = "Price History",
}: PriceChartProps) {
  const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const firstPrice = data.length > 0 ? data[0].close : 0;
  const isPositive = latestPrice >= firstPrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-lg font-bold">
            {formatCurrency(latestPrice)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No price data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id="priceGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={
                      isPositive
                        ? "hsl(142, 76%, 36%)"
                        : "hsl(0, 84%, 60%)"
                    }
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={
                      isPositive
                        ? "hsl(142, 76%, 36%)"
                        : "hsl(0, 84%, 60%)"
                    }
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
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
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                domain={["auto", "auto"]}
              />
              {entryPrice && (
                <ReferenceLine
                  y={entryPrice}
                  stroke="hsl(221, 83%, 53%)"
                  strokeDasharray="5 5"
                  label={{
                    value: `Avg Entry ${formatCurrency(entryPrice)}`,
                    position: "right",
                    fill: "hsl(221, 83%, 53%)",
                    fontSize: 11,
                  }}
                />
              )}
              {fiftyTwoWeekHigh && (
                <ReferenceLine
                  y={fiftyTwoWeekHigh}
                  stroke="hsl(142, 76%, 36%)"
                  strokeDasharray="3 3"
                  label={{
                    value: "52W High",
                    position: "right",
                    fill: "hsl(142, 76%, 36%)",
                    fontSize: 10,
                  }}
                />
              )}
              {fiftyTwoWeekLow && (
                <ReferenceLine
                  y={fiftyTwoWeekLow}
                  stroke="hsl(0, 84%, 60%)"
                  strokeDasharray="3 3"
                  label={{
                    value: "52W Low",
                    position: "right",
                    fill: "hsl(0, 84%, 60%)",
                    fontSize: 10,
                  }}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as HistoricalPrice;
                  return (
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                      <p className="text-sm text-muted-foreground">{d.date}</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(d.close)}
                      </p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span>O: {formatCurrency(d.open)}</span>{" "}
                        <span>H: {formatCurrency(d.high)}</span>{" "}
                        <span>L: {formatCurrency(d.low)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={
                  isPositive
                    ? "hsl(142, 76%, 36%)"
                    : "hsl(0, 84%, 60%)"
                }
                fill="url(#priceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
