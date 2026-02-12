"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/lib/nav-config";

interface CommandPaletteProps {
  holdings: { symbol: string; name: string }[];
}

export function CommandPalette({ holdings }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, holdings, or actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => navigate(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {holdings.length > 0 && (
          <CommandGroup heading="Holdings">
            {holdings.map((h) => (
              <CommandItem
                key={h.symbol}
                onSelect={() =>
                  navigate(`/holdings/${encodeURIComponent(h.symbol)}`)
                }
              >
                <span className="mr-2 font-mono text-xs">{h.symbol}</span>
                <span className="text-muted-foreground">{h.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => navigate("/settings")}>
            Sync Accounts
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              window.location.reload();
            }}
          >
            Refresh Quotes
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
