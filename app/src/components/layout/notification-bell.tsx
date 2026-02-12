"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, X, AlertTriangle, Info, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUnreadAlerts, markAlertRead, dismissAlert } from "@/server/actions/alerts";
import type { AlertData, AlertSeverity } from "@/types";

const SEVERITY_STYLES: Record<AlertSeverity, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: "text-blue-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
  critical: { icon: AlertCircle, color: "text-red-500" },
};

export function NotificationBell() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getUnreadAlerts().then(setAlerts);
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markAlertRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true } : a))
      );
    });
  }

  function handleDismiss(id: string) {
    startTransition(async () => {
      await dismissAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <p className="text-xs text-muted-foreground">
            {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No alerts
            </div>
          ) : (
            alerts.map((alert) => {
              const style = SEVERITY_STYLES[alert.severity];
              const Icon = style.icon;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex gap-3 border-b px-4 py-3 last:border-0",
                    !alert.read && "bg-muted/50"
                  )}
                  onClick={() => !alert.read && handleMarkRead(alert.id)}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {alert.actionUrl ? (
                        <a
                          href={alert.actionUrl}
                          className="hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {alert.title}
                        </a>
                      ) : (
                        alert.title
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {alert.description}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(alert.id);
                    }}
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
