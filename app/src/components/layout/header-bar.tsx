"use client";

import { Suspense } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountFilterToggle } from "./account-filter-toggle";
import { CurrencyToggle } from "./currency-toggle";
import { NotificationBell } from "./notification-bell";
import { ChatSheetTrigger } from "./chat-sheet-trigger";

export function HeaderBar() {
  return (
    <div className="flex items-center justify-between border-b bg-card px-6 py-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-64 justify-start gap-2 text-muted-foreground"
        onClick={() => {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
          );
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Search...</span>
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>
      <div className="flex items-center gap-3">
        <Suspense>
          <CurrencyToggle />
        </Suspense>
        <Suspense>
          <AccountFilterToggle />
        </Suspense>
        <ChatSheetTrigger />
        <NotificationBell />
      </div>
    </div>
  );
}
