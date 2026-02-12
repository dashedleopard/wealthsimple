import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, AlertTriangle, PiggyBank, Scale, Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/types";

const ICON_MAP = {
  scissors: Scissors,
  alert: AlertTriangle,
  piggybank: PiggyBank,
  scale: Scale,
  target: Target,
} as const;

const SEVERITY_COLORS = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
} as const;

interface ActionItemsWidgetProps {
  items: ActionItem[];
}

export function ActionItemsWidget({ items }: ActionItemsWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Action Items</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            No actions needed — portfolio looks great
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border-l-4 bg-muted/30 p-3 transition-colors hover:bg-muted/60",
                    SEVERITY_COLORS[item.severity]
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
