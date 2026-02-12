import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DonutChart } from "@/components/charts/donut-chart";
import {
  getAllocationByAssetClass,
  getAllocationBySector,
  getAllocationByGeography,
  getAllocationByAccountType,
} from "@/server/actions/allocation";
import { formatCurrency } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function AllocationPage() {
  const [assetClass, sector, geography, accountType] = await Promise.all([
    getAllocationByAssetClass(),
    getAllocationBySector(),
    getAllocationByGeography(),
    getAllocationByAccountType(),
  ]);

  const totalValue = assetClass.reduce(
    (sum, s) => sum + s.marketValue,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Allocation Analytics</h1>
        <p className="text-muted-foreground">
          Portfolio breakdown by asset class, sector, geography, and account type
        </p>
      </div>

      <Tabs defaultValue="asset-class">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="asset-class">Asset Class</TabsTrigger>
          <TabsTrigger value="sector">Sector</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="account-type">Account Type</TabsTrigger>
        </TabsList>

        <TabsContent value="asset-class" className="mt-4">
          <AllocationView
            data={assetClass}
            totalValue={totalValue}
          />
        </TabsContent>

        <TabsContent value="sector" className="mt-4">
          <AllocationView
            data={sector}
            totalValue={totalValue}
          />
        </TabsContent>

        <TabsContent value="geography" className="mt-4">
          <AllocationView
            data={geography}
            totalValue={totalValue}
          />
        </TabsContent>

        <TabsContent value="account-type" className="mt-4">
          <AllocationView
            data={accountType}
            totalValue={totalValue}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AllocationView({
  data,
  totalValue,
}: {
  data: { name: string; marketValue: number; percentage: number; count: number; color: string }[];
  totalValue: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-muted-foreground">
              No data available.
            </div>
          ) : (
            <DonutChart
              data={data}
              centerLabel={formatCurrency(totalValue)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No allocation data.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Positions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <span className="font-medium">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.marketValue)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
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
