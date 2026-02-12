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
import type { WhatIfResult } from "@/types";

function formatCAD(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function TaxCascadeVisualization({
  result,
  isCorporate,
}: {
  result: WhatIfResult;
  isCorporate: boolean;
}) {
  const data = [
    { name: "Proceeds", value: result.proceeds, color: "hsl(142, 76%, 36%)" },
    { name: "Cost Basis", value: -result.costBasis, color: "hsl(210, 40%, 50%)" },
    { name: "Capital Gain", value: result.capitalGain, color: "hsl(142, 76%, 36%)" },
    { name: "Taxable (50%)", value: result.taxableGain, color: "hsl(47, 96%, 53%)" },
    { name: "Tax", value: -result.estimatedTax, color: "hsl(0, 84%, 60%)" },
    { name: "Net Proceeds", value: result.netAfterTax, color: "hsl(142, 76%, 36%)" },
  ];

  if (isCorporate) {
    data.push(
      { name: "CDA Add", value: result.cdaImpact, color: "hsl(262, 83%, 58%)" },
      { name: "RDTOH Add", value: result.rdtohImpact, color: "hsl(221, 83%, 53%)" }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Cascade</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v) => formatCAD(Math.abs(v))}
            />
            <YAxis type="category" dataKey="name" width={80} />
            <Tooltip
              formatter={(value: number) => formatCAD(Math.abs(value))}
            />
            <ReferenceLine x={0} stroke="#666" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
