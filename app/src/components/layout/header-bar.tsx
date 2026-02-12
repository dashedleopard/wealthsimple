"use client";

import { Suspense } from "react";
import { AccountFilterToggle } from "./account-filter-toggle";
import { CurrencyToggle } from "./currency-toggle";

export function HeaderBar() {
  return (
    <div className="flex items-center justify-between border-b bg-card px-6 py-2">
      <span className="text-sm text-muted-foreground">Portfolio View</span>
      <div className="flex items-center gap-3">
        <Suspense>
          <CurrencyToggle />
        </Suspense>
        <Suspense>
          <AccountFilterToggle />
        </Suspense>
      </div>
    </div>
  );
}
