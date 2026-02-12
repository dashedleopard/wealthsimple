import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="h-[250px] w-full rounded-lg" />
    </div>
  );
}
