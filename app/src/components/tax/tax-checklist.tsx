"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { toggleChecklistItem } from "@/server/actions/checklist";
import type { ChecklistItem } from "@/server/actions/checklist";
import type { ChecklistStatus } from "@/lib/checklist-items";

interface TaxChecklistProps {
  items: ChecklistItem[];
  year: number;
}

const STATUS_CONFIG: Record<
  ChecklistStatus,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    label: "Done",
  },
  action_needed: {
    icon: AlertTriangle,
    color: "text-amber-500",
    label: "Action Needed",
  },
  upcoming: {
    icon: Clock,
    color: "text-blue-500",
    label: "Upcoming",
  },
  overdue: {
    icon: AlertCircle,
    color: "text-red-500",
    label: "Overdue",
  },
  not_applicable: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "N/A",
  },
};

const BORDER_COLORS: Record<ChecklistStatus, string> = {
  completed: "",
  action_needed: "border-l-amber-500",
  upcoming: "",
  overdue: "border-l-red-500",
  not_applicable: "",
};

export function TaxChecklist({ items, year }: TaxChecklistProps) {
  const [isPending, startTransition] = useTransition();

  const completedCount = items.filter((i) => i.status === "completed").length;
  const actionNeeded = items.filter(
    (i) => i.status === "action_needed" || i.status === "overdue"
  ).length;

  function handleToggle(itemId: string, currentlyCompleted: boolean) {
    startTransition(async () => {
      await toggleChecklistItem(itemId, year, !currentlyCompleted);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Year-End Tax Checklist
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{items.length}
            </span>
            {actionNeeded > 0 && (
              <Badge variant="destructive" className="text-xs">
                {actionNeeded} action{actionNeeded !== 1 ? "s" : ""} needed
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {items.map((item) => {
            const config = STATUS_CONFIG[item.status];
            const Icon = config.icon;
            const borderColor = BORDER_COLORS[item.status];

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-l-4 p-3 transition-colors",
                  borderColor || "border-l-transparent",
                  item.status === "completed" && "opacity-60"
                )}
              >
                <button
                  onClick={() =>
                    handleToggle(item.id, item.manuallyCompleted)
                  }
                  disabled={isPending}
                  className="mt-0.5 shrink-0"
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={item.href}
                      className={cn(
                        "text-sm font-medium hover:underline",
                        item.status === "completed" && "line-through"
                      )}
                    >
                      {item.title}
                    </Link>
                    <Badge variant="outline" className="text-[10px]">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Deadline:{" "}
                    {new Date(item.deadline).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
