import { prisma } from "@/lib/prisma";
import { CommandPalette } from "./command-palette";

export async function CommandPaletteProvider() {
  const positions = await prisma.position.findMany({
    distinct: ["symbol"],
    select: { symbol: true, name: true },
    orderBy: { marketValue: "desc" },
    take: 50,
  });

  const holdings = positions.map((p) => ({
    symbol: p.symbol,
    name: p.name,
  }));

  return <CommandPalette holdings={holdings} />;
}
