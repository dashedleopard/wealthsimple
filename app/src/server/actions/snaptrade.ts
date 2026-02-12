"use server";

import { prisma } from "@/lib/prisma";
import { getSnaptradeClient } from "@/lib/snaptrade";
import { revalidatePath } from "next/cache";
import { enrichSecurities } from "./securities";

const SNAPTRADE_USER_ID = "wealthview-default-user";

async function registerFreshSnaptradeUser() {
  // Delete stale DB record
  await prisma.snaptradeUser.deleteMany({ where: { id: "default" } });

  // Delete from Snaptrade too (ignore errors if user doesn't exist)
  try {
    await getSnaptradeClient().authentication.deleteSnapTradeUser({
      userId: SNAPTRADE_USER_ID,
    });
  } catch {
    // User may not exist on Snaptrade — that's fine
  }

  const { data } = await getSnaptradeClient().authentication.registerSnapTradeUser({
    userId: SNAPTRADE_USER_ID,
  });

  return prisma.snaptradeUser.create({
    data: {
      id: "default",
      snaptradeUserId: data.userId!,
      userSecret: data.userSecret!,
    },
  });
}

async function getOrCreateSnaptradeUser() {
  const existing = await prisma.snaptradeUser.findUnique({
    where: { id: "default" },
  });

  if (existing) {
    return existing;
  }

  return registerFreshSnaptradeUser();
}

async function loginSnaptradeUser(user: { snaptradeUserId: string; userSecret: string }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data } = await getSnaptradeClient().authentication.loginSnapTradeUser({
    userId: user.snaptradeUserId,
    userSecret: user.userSecret,
    broker: "WEALTHSIMPLETRADE",
    customRedirect: `${appUrl}/settings?connected=true`,
    connectionType: "read",
  });

  const response = data as Record<string, unknown>;
  return response.redirectURI ?? response.loginRedirectURI ?? response.redirect_uri;
}

export async function getSnaptradeConnectUrl(): Promise<{ url?: string; error?: string }> {
  try {
    const clientId = process.env.SNAPTRADE_CLIENT_ID?.trim();
    const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY?.trim();

    if (!clientId || !consumerKey) {
      return { error: "Snaptrade credentials not configured." };
    }

    let user = await getOrCreateSnaptradeUser();

    let redirectURI: unknown;
    try {
      redirectURI = await loginSnaptradeUser(user);
    } catch (loginErr) {
      const msg = String(loginErr);
      // If 404 or 401 — stale user. Re-register and retry once.
      if (msg.includes("404") || msg.includes("401")) {
        console.log("Snaptrade user stale, re-registering...");
        user = await registerFreshSnaptradeUser();
        redirectURI = await loginSnaptradeUser(user);
      } else {
        throw loginErr;
      }
    }

    if (!redirectURI) {
      return { error: "No redirect URL returned from Snaptrade." };
    }
    return { url: String(redirectURI) };
  } catch (e: unknown) {
    // Extract the full API error response if available (Axios-based SDK)
    const axiosErr = e as { response?: { status?: number; data?: unknown } };
    const body = axiosErr?.response?.data;
    const status = axiosErr?.response?.status;
    const message = e instanceof Error ? e.message : String(e);
    const detail = body ? ` | API response: ${JSON.stringify(body)}` : "";

    console.error("Snaptrade connect error:", message, detail);
    return { error: `${message}${detail}` };
  }
}

export async function getSnaptradeConnections() {
  const user = await prisma.snaptradeUser.findUnique({
    where: { id: "default" },
  });

  if (!user) return [];

  try {
    const { data } = await getSnaptradeClient().connections.listBrokerageAuthorizations({
      userId: user.snaptradeUserId,
      userSecret: user.userSecret,
    });
    return data ?? [];
  } catch {
    return [];
  }
}

function normalizeAccountType(name: string | null | undefined, rawType: string | null | undefined): string {
  const combined = `${name ?? ""} ${rawType ?? ""}`.toLowerCase();
  if (combined.includes("tfsa")) return "TFSA";
  if (combined.includes("rrsp")) return "RRSP";
  if (combined.includes("fhsa")) return "FHSA";
  if (combined.includes("resp")) return "RESP";
  if (combined.includes("lira")) return "LIRA";
  if (combined.includes("crypto")) return "CRYPTO";
  if (combined.includes("usd") || combined.includes("us ")) return "USD";
  return "NON_REG";
}

function normalizeActivityType(type: string): string {
  const map: Record<string, string> = {
    BUY: "buy",
    SELL: "sell",
    DIVIDEND: "dividend",
    CONTRIBUTION: "deposit",
    WITHDRAWAL: "withdrawal",
    INTEREST: "interest",
    FEE: "fee",
    TAX: "fee",
    TRANSFER: "transfer",
    REI: "dividend", // reinvested dividend
    SPLIT: "transfer",
    STOCK_DIVIDEND: "dividend",
  };
  return map[type] ?? type.toLowerCase();
}

export async function syncFromSnaptrade() {
  const user = await prisma.snaptradeUser.findUnique({
    where: { id: "default" },
  });

  if (!user) {
    throw new Error("No Snaptrade user found. Connect your account first.");
  }

  const syncLog = await prisma.syncLog.create({
    data: { status: "running" },
  });

  try {
    // 1. Fetch accounts
    const { data: stAccounts } =
      await getSnaptradeClient().accountInformation.listUserAccounts({
        userId: user.snaptradeUserId,
        userSecret: user.userSecret,
      });

    let positionsCount = 0;
    let activitiesCount = 0;
    let dividendsCount = 0;

    for (const stAccount of stAccounts ?? []) {
      const accountId = stAccount.id!;
      const accountType = normalizeAccountType(stAccount.name, stAccount.raw_type);
      const currency = stAccount.balance?.total?.currency ?? "CAD";
      const nlv = stAccount.balance?.total?.amount ?? 0;

      // Upsert account
      await prisma.account.upsert({
        where: { id: accountId },
        create: {
          id: accountId,
          type: accountType,
          nickname: stAccount.name,
          currency,
          status: "open",
          netliquidation: nlv,
        },
        update: {
          type: accountType,
          nickname: stAccount.name,
          currency,
          netliquidation: nlv,
        },
      });

      // 2. Fetch positions for this account
      try {
        const { data: holdings } =
          await getSnaptradeClient().accountInformation.getUserAccountPositions({
            userId: user.snaptradeUserId,
            userSecret: user.userSecret,
            accountId,
          });

        // Clear old positions for this account then re-insert
        await prisma.position.deleteMany({ where: { accountId } });

        for (const pos of holdings ?? []) {
          // Snaptrade SDK nests: pos.symbol (PositionSymbol) → .symbol (UniversalSymbol) → .symbol (ticker string)
          const sec = pos.symbol?.symbol as Record<string, unknown> | undefined;
          const ticker = (sec?.symbol as string) ?? (sec?.raw_symbol as string) ?? "UNKNOWN";
          const name = (sec?.description as string) ?? ticker;
          const units = pos.units ?? 0;
          const avgPrice = pos.average_purchase_price ?? 0;
          const currentPrice = pos.price ?? avgPrice;
          const bookValue = units * avgPrice;
          const marketValue = units * currentPrice;
          const gainLoss = marketValue - bookValue;
          const gainLossPct = bookValue > 0 ? Math.min(Math.max((gainLoss / bookValue) * 100, -99999999), 99999999) : 0;
          const secId = sec?.id as string | undefined;
          const secType = sec?.type as Record<string, unknown> | undefined;
          const secExchange = sec?.exchange as Record<string, unknown> | undefined;
          const secCurrency = sec?.currency as Record<string, unknown> | undefined;

          // Upsert security
          if (secId) {
            await prisma.security.upsert({
              where: { id: secId },
              create: {
                id: secId,
                symbol: ticker,
                name,
                type: (secType?.code as string)?.toLowerCase(),
                exchange: secExchange?.code as string | undefined,
                currency: (secCurrency?.code as string) ?? currency,
              },
              update: {
                name,
                type: (secType?.code as string)?.toLowerCase(),
                exchange: secExchange?.code as string | undefined,
              },
            });
          }

          await prisma.position.create({
            data: {
              accountId,
              securityId: secId ?? null,
              symbol: ticker,
              name,
              quantity: units,
              bookValue,
              marketValue,
              gainLoss,
              gainLossPct,
              currency: (secCurrency?.code as string) ?? currency,
            },
          });

          positionsCount++;
        }
      } catch (e) {
        console.error(`Failed to fetch positions for ${accountId}:`, e);
      }

      // 3. Fetch activities for this account
      try {
        const { data: activitiesResponse } =
          await getSnaptradeClient().transactionsAndReporting.getActivities({
            userId: user.snaptradeUserId,
            userSecret: user.userSecret,
            startDate: "2020-01-01",
            endDate: new Date().toISOString().split("T")[0],
            accounts: accountId,
          });

        const activities = Array.isArray(activitiesResponse) ? activitiesResponse : [];

        for (const act of activities) {
          if (!act.id) continue;

          const actType = normalizeActivityType(act.type ?? "unknown");
          const symbol = act.symbol?.symbol ?? act.symbol?.raw_symbol ?? null;
          const amount = act.amount ?? (act.price ?? 0) * (act.units ?? 0);
          const occurredAt = act.settlement_date ?? act.trade_date ?? new Date().toISOString();

          await prisma.activity.upsert({
            where: { id: act.id },
            create: {
              id: act.id,
              accountId,
              type: actType,
              symbol,
              description: act.description,
              quantity: act.units ? Math.abs(act.units) : null,
              price: act.price ?? null,
              amount: Math.abs(amount),
              currency: act.currency?.code ?? currency,
              occurredAt: new Date(occurredAt),
            },
            update: {
              type: actType,
              symbol,
              description: act.description,
              quantity: act.units ? Math.abs(act.units) : null,
              price: act.price ?? null,
              amount: Math.abs(amount),
              currency: act.currency?.code ?? currency,
              occurredAt: new Date(occurredAt),
            },
          });

          activitiesCount++;

          // Extract dividends
          if (actType === "dividend" && symbol && amount) {
            const paymentDate = new Date(occurredAt);
            paymentDate.setHours(0, 0, 0, 0);

            await prisma.dividend.upsert({
              where: {
                accountId_symbol_paymentDate: {
                  accountId,
                  symbol,
                  paymentDate,
                },
              },
              create: {
                accountId,
                symbol,
                amount: Math.abs(amount),
                currency: act.currency?.code ?? currency,
                paymentDate,
              },
              update: {
                amount: Math.abs(amount),
                currency: act.currency?.code ?? currency,
              },
            });
            dividendsCount++;
          }
        }
      } catch (e) {
        console.error(`Failed to fetch activities for ${accountId}:`, e);
      }

      // 4. Create today's snapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.accountSnapshot.upsert({
        where: {
          accountId_date: { accountId, date: today },
        },
        create: {
          accountId,
          date: today,
          netliquidation: nlv,
        },
        update: {
          netliquidation: nlv,
        },
      });
    }

    // Update sync log
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "success",
        completedAt: new Date(),
        accountsCount: stAccounts?.length ?? 0,
        positionsCount,
        activitiesCount,
        snapshotsCount: stAccounts?.length ?? 0,
        dividendsCount,
      },
    });

    // Enrich securities with Yahoo Finance data (runs silently)
    try {
      await enrichSecurities();
    } catch (e) {
      console.error("Security enrichment failed (non-fatal):", e);
    }

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/holdings");
    revalidatePath("/performance");
    revalidatePath("/dividends");
    revalidatePath("/transactions");
    revalidatePath("/settings");
    revalidatePath("/allocation");
    revalidatePath("/tax");

    return {
      success: true,
      accounts: stAccounts?.length ?? 0,
      positions: positionsCount,
      activities: activitiesCount,
      dividends: dividendsCount,
    };
  } catch (error) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "error",
        completedAt: new Date(),
        error: String(error).slice(0, 500),
      },
    });

    throw error;
  }
}
