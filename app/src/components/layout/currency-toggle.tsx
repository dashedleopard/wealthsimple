"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DisplayCurrency } from "@/types";

const CURRENCIES: { value: DisplayCurrency; label: string }[] = [
  { value: "CAD", label: "CAD" },
  { value: "USD", label: "USD" },
];

export function CurrencyToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("currency") as DisplayCurrency) || "CAD";

  function setCurrency(value: DisplayCurrency) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "CAD") {
      params.delete("currency");
    } else {
      params.set("currency", value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex rounded-lg border bg-muted p-0.5">
      {CURRENCIES.map((c) => (
        <button
          key={c.value}
          onClick={() => setCurrency(c.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            current === c.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
