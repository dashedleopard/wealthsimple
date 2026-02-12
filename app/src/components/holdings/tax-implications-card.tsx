import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";

interface TaxImplication {
  accountId: string;
  accountName: string;
  accountType: string;
  quantity: number;
  bookValue: number;
  marketValue: number;
  unrealizedGain: number;
  taxRate: number;
  taxTreatment: string;
  estimatedTax: number;
  isSheltered: boolean;
  isCorporate: boolean;
}

export function TaxImplicationsCard({
  implications,
}: {
  implications: TaxImplication[];
}) {
  if (implications.length === 0) return null;

  const totalUnrealized = implications.reduce(
    (sum, i) => sum + i.unrealizedGain,
    0
  );
  const totalEstimatedTax = implications.reduce(
    (sum, i) => sum + i.estimatedTax,
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Implications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Unrealized: </span>
            <span
              className={
                totalUnrealized >= 0
                  ? "font-medium text-emerald-600"
                  : "font-medium text-red-600"
              }
            >
              {formatCurrency(totalUnrealized)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Est. Tax if Sold: </span>
            <span className="font-medium">
              {formatCurrency(totalEstimatedTax)}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {implications.map((impl) => (
            <div
              key={impl.accountId}
              className="flex items-start justify-between rounded-lg border p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {impl.accountName}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      impl.isSheltered
                        ? "border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                        : impl.isCorporate
                          ? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                          : "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                    }
                  >
                    {ACCOUNT_TYPE_LABELS[impl.accountType] ?? impl.accountType}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {impl.taxTreatment}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-medium ${impl.unrealizedGain >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {formatCurrency(impl.unrealizedGain)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Tax: {formatCurrency(impl.estimatedTax)} (
                  {formatPercent(impl.taxRate * 100)})
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
