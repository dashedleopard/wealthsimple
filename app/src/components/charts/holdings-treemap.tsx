"use client";

import { useRouter } from "next/navigation";
import { Treemap, ResponsiveContainer } from "recharts";
import type { PositionWithAccountDetail } from "@/types";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface HoldingsTreemapProps {
  positions: PositionWithAccountDetail[];
}

function interpolateColor(pct: number): string {
  // pct is gain/loss percentage. Negative = red, 0 = gray, positive = green
  const clamped = Math.max(-30, Math.min(30, pct));
  const ratio = (clamped + 30) / 60; // 0 to 1

  if (ratio < 0.5) {
    // red to gray
    const t = ratio * 2;
    const r = Math.round(220 - t * 70);
    const g = Math.round(50 + t * 120);
    const b = Math.round(50 + t * 120);
    return `rgb(${r},${g},${b})`;
  } else {
    // gray to green
    const t = (ratio - 0.5) * 2;
    const r = Math.round(150 - t * 110);
    const g = Math.round(170 + t * 60);
    const b = Math.round(170 - t * 100);
    return `rgb(${r},${g},${b})`;
  }
}

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  gainLossPct: number;
  value: number;
}

function CustomContent(props: TreemapContentProps) {
  const { x, y, width, height, name, gainLossPct, value } = props;
  if (width < 30 || height < 20) return null;

  const fill = interpolateColor(gainLossPct);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
        className="cursor-pointer transition-opacity hover:opacity-80"
      />
      {width > 60 && height > 35 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={Math.min(14, width / 6)}
            fontWeight="bold"
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
            fontSize={Math.min(11, width / 8)}
          >
            {formatPercent(gainLossPct)}
          </text>
          {width > 100 && height > 50 && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 22}
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize={Math.min(10, width / 10)}
            >
              {formatCurrency(value)}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function HoldingsTreemap({ positions }: HoldingsTreemapProps) {
  const router = useRouter();

  const data = positions.map((p) => ({
    name: p.symbol,
    value: Math.max(1, p.totalMarketValue),
    gainLossPct: p.gainLossPct,
    symbol: p.symbol,
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="value"
          stroke="#fff"
          content={<CustomContent x={0} y={0} width={0} height={0} name="" gainLossPct={0} value={0} />}
          onClick={(node) => {
            if (node?.symbol) {
              router.push(`/holdings/${encodeURIComponent(node.symbol as string)}`);
            }
          }}
        />
      </ResponsiveContainer>
    </div>
  );
}
