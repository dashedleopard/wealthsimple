import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getLatestSync, getSyncHistory } from "@/server/actions/sync";
import { getSnaptradeConnections } from "@/server/actions/snaptrade";
import { formatDate } from "@/lib/formatters";
import { ConnectButton, SyncButton } from "@/components/snaptrade-connect";
import { CheckCircle2, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

function SyncStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <Badge className="bg-emerald-600">Success</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    case "running":
      return <Badge variant="secondary">Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const sp = await searchParams;
  const justConnected = sp.connected === "true";

  const [latestSync, syncHistory, connections] = await Promise.all([
    getLatestSync(),
    getSyncHistory(20),
    getSnaptradeConnections(),
  ]);

  const isConnected = connections.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Connect and sync your Wealthsimple data
        </p>
      </div>

      {justConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Wealthsimple connected successfully!
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Click &quot;Sync Now&quot; below to pull your data.
            </p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Wealthsimple Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-600">Connected</Badge>
                <span className="text-sm text-muted-foreground">
                  {connections.length} brokerage connection{connections.length !== 1 ? "s" : ""}
                </span>
              </div>
              <SyncButton />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Connect your Wealthsimple account to sync your portfolio data.
                You&apos;ll be redirected to Snaptrade&apos;s secure portal to
                log in with your Wealthsimple credentials.
              </p>
              <ConnectButton />
              <p className="text-xs text-muted-foreground">
                Your credentials are handled securely by Snaptrade. This app
                never sees your Wealthsimple password.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Last Sync</CardTitle>
        </CardHeader>
        <CardContent>
          {latestSync ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SyncStatusBadge status={latestSync.status} />
                <span className="text-sm text-muted-foreground">
                  {formatDate(latestSync.startedAt)}
                  {latestSync.completedAt &&
                    ` — completed ${formatDate(latestSync.completedAt)}`}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-5">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Accounts</p>
                  <p className="text-xl font-bold">
                    {latestSync.accountsCount}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Positions</p>
                  <p className="text-xl font-bold">
                    {latestSync.positionsCount}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Activities</p>
                  <p className="text-xl font-bold">
                    {latestSync.activitiesCount}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Snapshots</p>
                  <p className="text-xl font-bold">
                    {latestSync.snapshotsCount}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Dividends</p>
                  <p className="text-xl font-bold">
                    {latestSync.dividendsCount}
                  </p>
                </div>
              </div>
              {latestSync.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {latestSync.error}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No sync has been run yet. Connect your account and click Sync Now.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      {syncHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Positions</TableHead>
                  <TableHead className="text-right">Activities</TableHead>
                  <TableHead className="text-right">Dividends</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.startedAt)}
                    </TableCell>
                    <TableCell>
                      <SyncStatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {log.accountsCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.positionsCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.activitiesCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.dividendsCount}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {log.error || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
