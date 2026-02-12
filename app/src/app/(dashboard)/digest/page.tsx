import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWeeklyDigest } from "@/server/actions/digest";
import { getEnhancedTLHCandidates } from "@/server/actions/tax";
import { getGoals } from "@/server/actions/goals";
import { getUnreadAlerts } from "@/server/actions/alerts";
import {
  formatCurrency,
  formatPercent,
  formatCompactCurrency,
} from "@/lib/formatters";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/formatters";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scissors,
  Bell,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const [digest, tlhCandidates, goals, alerts] = await Promise.all([
    getWeeklyDigest(),
    getEnhancedTLHCandidates(),
    getGoals(),
    getUnreadAlerts(),
  ]);

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentDividends = await prisma.dividend.findMany({
    where: { paymentDate: { gte: oneWeekAgo } },
    orderBy: { paymentDate: "desc" },
  });

  const isPositive = digest.portfolioChange >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Weekly Digest</h1>
        <p className="text-muted-foreground">
          What changed in your portfolio this week
        </p>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">
                {formatCurrency(digest.currentValue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">7-Day Change</p>
              <p
                className={`text-2xl font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {isPositive ? "+" : ""}
                {formatCurrency(digest.portfolioChange)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">7-Day Return</p>
              <p
                className={`text-2xl font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {formatPercent(digest.portfolioChangePct)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dividends */}
      {recentDividends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Dividends Received ({recentDividends.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentDividends.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{d.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.paymentDate).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(toNumber(d.amount))}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TLH Opportunities */}
      {tlhCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Tax-Loss Harvesting ({tlhCandidates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tlhCandidates.slice(0, 5).map((c) => (
                <div
                  key={c.symbol}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{c.symbol}</p>
                    <p className="text-xs text-muted-foreground">{c.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(c.unrealizedLoss)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Save ~{formatCurrency(c.estimatedTaxSavings)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {goals.map((g) => {
                const target = Number(g.targetAmount);
                const current = Number(g.currentAmount);
                const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
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
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Badge
                    variant={
                      a.severity === "critical"
                        ? "destructive"
                        : a.severity === "warning"
                          ? "outline"
                          : "secondary"
                    }
                  >
                    {a.severity}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
