import { cn } from "@/lib/utils";

interface TLHTrafficLightProps {
  harvestStatus: "safe" | "approaching" | "risky";
  daysSinceLastBuy?: number;
  daysUntilSafe?: number;
}

const STATUS_CONFIG = {
  safe: {
    color: "bg-emerald-500",
    label: "Safe to harvest",
    detail: (props: TLHTrafficLightProps) =>
      `30+ days since last buy${props.daysSinceLastBuy ? ` (${props.daysSinceLastBuy}d)` : ""}`,
  },
  approaching: {
    color: "bg-amber-500",
    label: "Approaching safe window",
    detail: (props: TLHTrafficLightProps) =>
      props.daysUntilSafe
        ? `Wait ${props.daysUntilSafe} more days`
        : "20-30 days since last buy",
  },
  risky: {
    color: "bg-red-500",
    label: "Superficial loss risk",
    detail: (props: TLHTrafficLightProps) =>
      props.daysUntilSafe
        ? `Wait ${props.daysUntilSafe} more days`
        : "Recent buy within 30 days",
  },
} as const;

export function TLHTrafficLight(props: TLHTrafficLightProps) {
  const config = STATUS_CONFIG[props.harvestStatus];

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("h-3 w-3 rounded-full shrink-0", config.color)}
      />
      <div>
        <p className="text-xs font-medium">{config.label}</p>
        <p className="text-[10px] text-muted-foreground">
          {config.detail(props)}
        </p>
      </div>
    </div>
  );
}
