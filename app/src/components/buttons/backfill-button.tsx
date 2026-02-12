"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
import { backfillHistoricalSnapshots } from "@/server/actions/backfill";

export function BackfillButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      const res = await backfillHistoricalSnapshots();
      if ("error" in res && res.error) {
        setResult(`Error: ${res.error}`);
      } else if ("success" in res) {
        setResult(
          `Backfilled ${res.snapshots} snapshots across ${res.accounts} accounts`
        );
      }
    } catch (e) {
      setResult(`Error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={loading}
        variant="outline"
        size="sm"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <History className="mr-2 h-4 w-4" />
        )}
        Backfill History
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">{result}</p>
      )}
    </div>
  );
}
