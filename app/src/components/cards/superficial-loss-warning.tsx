import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SuperficialLossWarning() {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          CRA Superficial Loss Rule
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-amber-700 dark:text-amber-300">
        <p className="mb-2">
          Under CRA rules, a capital loss is denied if you (or an affiliated
          person) buy the same or identical security within <strong>30 days
          before or after</strong> the sale that generated the loss, and still
          hold it at the end of that 30-day period.
        </p>
        <p>
          Positions marked with a warning icon have had recent buy activity
          that could trigger this rule. Consult your tax advisor before
          harvesting these losses.
        </p>
      </CardContent>
    </Card>
  );
}
