import { Suspense } from "react";
import { getActionItems } from "@/server/actions/action-items";
import { getWeeklyDigest } from "@/server/actions/digest";
import { ActionItemsWidget } from "@/components/dashboard/action-items-widget";
import { WeeklyDigestCard } from "@/components/dashboard/weekly-digest-card";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardSectorsMovers } from "@/components/dashboard/dashboard-sectors-movers";
import { DashboardGoals } from "@/components/dashboard/dashboard-goals";
import { DashboardAccounts } from "@/components/dashboard/dashboard-accounts";
import { DashboardActivity } from "@/components/dashboard/dashboard-activity";
import { KpiGridSkeleton } from "@/components/skeletons/kpi-grid-skeleton";
import { ChartSkeleton } from "@/components/skeletons/chart-skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import type { AccountFilter } from "@/lib/account-filter";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp.view as AccountFilter) || undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your Wealthsimple portfolio at a glance
        </p>
      </div>

      <Suspense fallback={<KpiGridSkeleton />}>
        <DashboardKpis filter={filter} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        }
      >
        <DashboardActionRow />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
            <ChartSkeleton />
          </div>
        }
      >
        <DashboardCharts filter={filter} />
      </Suspense>

      <Suspense fallback={null}>
        <DashboardGoals />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        }
      >
        <DashboardSectorsMovers filter={filter} />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={3} cols={3} />}>
        <DashboardAccounts filter={filter} />
      </Suspense>

      <Suspense fallback={<TableSkeleton />}>
        <DashboardActivity />
      </Suspense>
    </div>
  );
}

async function DashboardActionRow() {
  const [actionItems, weeklyDigest] = await Promise.all([
    getActionItems(),
    getWeeklyDigest(),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ActionItemsWidget items={actionItems} />
      <WeeklyDigestCard digest={weeklyDigest} />
    </div>
  );
}
