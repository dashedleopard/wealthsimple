import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function TLHUrgencyBanner() {
  const now = new Date();
  const year = now.getFullYear();
  const yearEnd = new Date(year, 11, 24); // Dec 24 (last trading day approx)
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const urgency =
    daysRemaining > 90
      ? "green"
      : daysRemaining > 30
        ? "amber"
        : "red";

  const colors = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    red: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  };

  return (
    <Card className={cn("border", colors[urgency])}>
      <CardContent className="flex items-center gap-3 py-3">
        <Clock className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {daysRemaining} days remaining to harvest losses for {year} tax year
          </p>
          <p className="text-xs opacity-75">
            Last trading day is approximately Dec 24, {year}. Settlement takes
            T+1.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
