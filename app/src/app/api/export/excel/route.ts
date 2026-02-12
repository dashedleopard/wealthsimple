import { NextRequest, NextResponse } from "next/server";
import { gatherExportData } from "@/lib/export/gather-export-data";

export const maxDuration = 30;

function fmt(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();

  try {
    const data = await gatherExportData(year);
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.default.Workbook();

    // Sheet 1: Summary
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.addRow(["Tax Report", year]);
    summarySheet.addRow([]);
    summarySheet.addRow(["Capital Gains Summary"]);
    summarySheet.addRow(["Realized Gains", fmt(data.summary.realizedGains)]);
    summarySheet.addRow(["Realized Losses", fmt(data.summary.realizedLosses)]);
    summarySheet.addRow(["Net Capital Gains", fmt(data.summary.netCapitalGains)]);
    summarySheet.addRow(["Taxable Amount (50%)", fmt(data.summary.taxableAmount)]);
    summarySheet.addRow([]);
    summarySheet.addRow(["Corporate"]);
    summarySheet.addRow(["Corporate Gains", fmt(data.splitSummary.corporate.gains)]);
    summarySheet.addRow(["Corporate Losses", fmt(data.splitSummary.corporate.losses)]);
    summarySheet.addRow(["Corporate Net", fmt(data.splitSummary.corporate.net)]);
    summarySheet.addRow(["SBD Reduction", fmt(data.splitSummary.corporate.sbdReduction)]);
    summarySheet.getColumn(1).width = 25;
    summarySheet.getColumn(2).width = 18;

    // Sheet 2: Realized Gains
    const realizedSheet = workbook.addWorksheet("Realized Gains");
    realizedSheet.addRow(["Symbol", "Date", "Account", "Proceeds", "Cost Basis", "Gain/Loss", "Taxable"]);
    for (const g of data.realizedGains) {
      realizedSheet.addRow([
        g.symbol,
        g.sellDate,
        g.accountType,
        fmt(g.proceeds),
        fmt(g.costBasis),
        fmt(g.gainLoss),
        g.isTaxable ? "Yes" : "No",
      ]);
    }
    realizedSheet.columns.forEach((col) => (col.width = 15));

    // Sheet 3: Unrealized Gains
    const unrealizedSheet = workbook.addWorksheet("Unrealized Gains");
    unrealizedSheet.addRow(["Symbol", "Name", "Account", "Book Value", "Market Value", "Unrealized G/L", "Days Held"]);
    for (const g of data.unrealizedGains) {
      unrealizedSheet.addRow([
        g.symbol,
        g.name,
        g.accountType,
        fmt(g.bookValue),
        fmt(g.marketValue),
        fmt(g.unrealizedGainLoss),
        g.daysHeld,
      ]);
    }
    unrealizedSheet.columns.forEach((col) => (col.width = 15));

    // Sheet 4: Dividends
    const divSheet = workbook.addWorksheet("Dividends");
    divSheet.addRow(["YTD Total", fmt(data.dividendSummary.ytdTotal)]);
    divSheet.addRow(["Projected Annual", fmt(data.dividendSummary.projectedAnnual)]);
    divSheet.addRow(["Unique Securities", data.dividendSummary.uniqueSymbols]);
    divSheet.addRow(["Payment Count", data.dividendSummary.dividendCount]);
    divSheet.getColumn(1).width = 20;
    divSheet.getColumn(2).width = 18;

    // Sheet 5: Contribution Room
    const contribSheet = workbook.addWorksheet("Contribution Room");
    contribSheet.addRow(["Account Type", "Room Amount", "Used Amount", "Remaining", "Notes"]);
    for (const c of data.contributions) {
      contribSheet.addRow([c.accountType, fmt(c.roomAmount), fmt(c.usedAmount), fmt(c.remaining), c.notes ?? ""]);
    }
    contribSheet.columns.forEach((col) => (col.width = 18));

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tax-report-${year}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Excel generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel" },
      { status: 500 }
    );
  }
}
