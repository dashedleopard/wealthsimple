import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGoals } from "@/server/actions/goals";
import { formatCompactCurrency } from "@/lib/formatters";

export async function DashboardGoals() {
  const goals = await getGoals();

  if (goals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goal Progress
          </span>
          <Link
            href="/goals"
            className="text-sm font-normal text-primary hover:underline"
          >
            View All &rarr;
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {goals.slice(0, 3).map((goal) => {
            const target = Number(goal.targetAmount);
            const current = Number(goal.currentAmount);
            const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            return (
              <div key={goal.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatCompactCurrency(current)} / {formatCompactCurrency(target)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
