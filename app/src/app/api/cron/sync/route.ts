import { NextResponse } from "next/server";
import { syncFromSnaptrade } from "@/server/actions/snaptrade";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for full sync

export async function GET(request: Request) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncFromSnaptrade();
    return NextResponse.json({
      ...result,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron sync failed:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
