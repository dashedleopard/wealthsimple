import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { CommandPaletteProvider } from "@/components/layout/command-palette-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-60 flex flex-1 flex-col">
        <HeaderBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Suspense fallback={null}>
        <CommandPaletteProvider />
      </Suspense>
    </div>
  );
}
