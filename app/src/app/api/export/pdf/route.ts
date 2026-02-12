import { NextRequest, NextResponse } from "next/server";
import { gatherExportData } from "@/lib/export/gather-export-data";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();

  try {
    const data = await gatherExportData(year);

    // Dynamic imports to keep bundle small
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { TaxReportPDF } = await import("@/lib/export/tax-report-pdf");
    const React = await import("react");

    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(TaxReportPDF, { data }) as any
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tax-report-${year}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
