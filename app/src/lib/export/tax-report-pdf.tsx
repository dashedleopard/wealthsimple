import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ExportData } from "./gather-export-data";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 24, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 12, color: "#666", marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  cell: { flex: 1 },
  cellRight: { flex: 1, textAlign: "right" },
  kpiGrid: { flexDirection: "row", gap: 16, marginBottom: 16 },
  kpiBox: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  kpiLabel: { fontSize: 8, color: "#666", marginBottom: 2 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

function fmt(n: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(n);
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

interface TaxReportPDFProps {
  data: ExportData;
}

export function TaxReportPDF({ data }: TaxReportPDFProps) {
  const { year, realizedGains, unrealizedGains, summary, splitSummary, contributions, dividendSummary } = data;
  const taxableGains = realizedGains.filter((g) => g.isTaxable);

  return (
    <Document>
      {/* Cover / Summary Page */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Tax Report — {year}</Text>
        <Text style={styles.subtitle}>
          Generated {new Date().toLocaleDateString("en-CA")} | WealthView
        </Text>

        <Text style={styles.sectionTitle}>Capital Gains Summary</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Realized Gains</Text>
            <Text style={styles.kpiValue}>{fmt(summary.realizedGains)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Realized Losses</Text>
            <Text style={styles.kpiValue}>{fmt(summary.realizedLosses)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Net Capital Gains</Text>
            <Text style={styles.kpiValue}>{fmt(summary.netCapitalGains)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Taxable (50%)</Text>
            <Text style={styles.kpiValue}>{fmt(summary.taxableAmount)}</Text>
          </View>
        </View>

        {(splitSummary.corporate.gains > 0 || splitSummary.corporate.losses > 0) && (
          <>
            <Text style={styles.sectionTitle}>Corporate Summary</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>Corporate Gains</Text>
                <Text style={styles.kpiValue}>{fmt(splitSummary.corporate.gains)}</Text>
              </View>
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>Corporate Net</Text>
                <Text style={styles.kpiValue}>{fmt(splitSummary.corporate.net)}</Text>
              </View>
              {splitSummary.corporate.sbdReduction > 0 && (
                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>SBD Reduction</Text>
                  <Text style={styles.kpiValue}>
                    {fmt(splitSummary.corporate.sbdReduction)}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Dividends</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>YTD Dividends</Text>
            <Text style={styles.kpiValue}>{fmt(dividendSummary.ytdTotal)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Projected Annual</Text>
            <Text style={styles.kpiValue}>{fmt(dividendSummary.projectedAnnual)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contribution Room</Text>
        {contributions.map((c) => (
          <View key={c.accountType} style={styles.row}>
            <Text style={styles.cell}>{c.accountType}</Text>
            <Text style={styles.cellRight}>Room: {fmt(c.roomAmount)}</Text>
            <Text style={styles.cellRight}>Used: {fmt(c.usedAmount)}</Text>
            <Text style={styles.cellRight}>Remaining: {fmt(c.remaining)}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          This report is for informational purposes only and should not be
          considered tax advice. Consult your accountant.
        </Text>
      </Page>

      {/* Realized Gains Detail Page */}
      {taxableGains.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.sectionTitle}>
            Realized Gains/Losses ({taxableGains.length} taxable transactions)
          </Text>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>Symbol</Text>
            <Text style={styles.cell}>Date</Text>
            <Text style={styles.cell}>Account</Text>
            <Text style={styles.cellRight}>Proceeds</Text>
            <Text style={styles.cellRight}>Cost Basis</Text>
            <Text style={styles.cellRight}>Gain/Loss</Text>
          </View>
          {taxableGains.map((g, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cell}>{g.symbol}</Text>
              <Text style={styles.cell}>{g.sellDate}</Text>
              <Text style={styles.cell}>{g.accountType}</Text>
              <Text style={styles.cellRight}>{fmt(g.proceeds)}</Text>
              <Text style={styles.cellRight}>{fmt(g.costBasis)}</Text>
              <Text style={styles.cellRight}>{fmt(g.gainLoss)}</Text>
            </View>
          ))}
          <Text style={styles.footer}>
            This report is for informational purposes only.
          </Text>
        </Page>
      )}

      {/* Unrealized Gains Page */}
      {unrealizedGains.length > 0 && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.sectionTitle}>
            Unrealized Gains/Losses ({unrealizedGains.length} positions)
          </Text>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>Symbol</Text>
            <Text style={styles.cell}>Account</Text>
            <Text style={styles.cellRight}>Book Value</Text>
            <Text style={styles.cellRight}>Market Value</Text>
            <Text style={styles.cellRight}>Unrealized</Text>
          </View>
          {unrealizedGains.map((g, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cell}>{g.symbol}</Text>
              <Text style={styles.cell}>{g.accountType}</Text>
              <Text style={styles.cellRight}>{fmt(g.bookValue)}</Text>
              <Text style={styles.cellRight}>{fmt(g.marketValue)}</Text>
              <Text style={styles.cellRight}>{fmt(g.unrealizedGainLoss)}</Text>
            </View>
          ))}
          <Text style={styles.footer}>
            This report is for informational purposes only.
          </Text>
        </Page>
      )}
    </Document>
  );
}
