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
import { formatDate } from "@/lib/formatters";

export const dynamic = 'force-dynamic';

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

export default async function SettingsPage() {
  const [latestSync, syncHistory] = await Promise.all([
    getLatestSync(),
    getSyncHistory(20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Sync status and configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          {latestSync ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SyncStatusBadge status={latestSync.status} />
                <span className="text-sm text-muted-foreground">
                  Last sync: {formatDate(latestSync.startedAt)}
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
            <div className="py-8 text-center text-muted-foreground">
              <p>No sync has been run yet.</p>
              <p className="mt-2 text-sm">
                Run <code className="rounded bg-muted px-2 py-1">python sync/fetch.py</code> to sync your Wealthsimple data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            The sync script runs locally on your machine and fetches data from
            Wealthsimple, then writes it to the shared database.
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs">
            <p># Navigate to the sync directory</p>
            <p>cd sync/</p>
            <p className="mt-2"># Create a virtual environment (first time only)</p>
            <p>python3 -m venv venv</p>
            <p>source venv/bin/activate</p>
            <p>pip install -r requirements.txt</p>
            <p className="mt-2"># Copy .env.example to .env and fill in credentials</p>
            <p>cp .env.example .env</p>
            <p className="mt-2"># Run the sync</p>
            <p>python fetch.py</p>
            <p className="mt-2"># Or with TOTP code</p>
            <p>python fetch.py --totp 123456</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No sync history.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Positions</TableHead>
                  <TableHead className="text-right">Activities</TableHead>
                  <TableHead className="text-right">Snapshots</TableHead>
                  <TableHead className="text-right">Dividends</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
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
                      {log.snapshotsCount}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
