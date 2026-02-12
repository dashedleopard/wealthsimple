"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { getSnaptradeConnectUrl, syncFromSnaptrade } from "@/server/actions/snaptrade";

export function ConnectButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const url = await getSnaptradeConnectUrl();
      window.location.href = url;
    } catch (error) {
      console.error("Failed to get connect URL:", error);
      alert("Failed to connect. Check that SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY are set.");
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleConnect} disabled={loading} size="lg">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Link2 className="mr-2 h-4 w-4" />
      )}
      Connect Wealthsimple
    </Button>
  );
}

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await syncFromSnaptrade();
      setResult({
        success: true,
        message: `Synced ${res.accounts} accounts, ${res.positions} positions, ${res.activities} activities, ${res.dividends} dividends`,
      });
    } catch (error) {
      setResult({
        success: false,
        message: String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleSync} disabled={loading} size="lg" variant="outline">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {loading ? "Syncing..." : "Sync Now"}
      </Button>
      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 ${
            result.success
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
          )}
          <p className="text-sm">{result.message}</p>
        </div>
      )}
    </div>
  );
}
