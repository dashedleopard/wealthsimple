"use server";

import { prisma } from "@/lib/prisma";
import { snaptrade } from "@/lib/snaptrade";
import { revalidatePath } from "next/cache";

const SNAPTRADE_USER_ID = "wealthview-default-user";

async function getOrCreateSnaptradeUser() {
  const existing = await prisma.snaptradeUser.findUnique({
    where: { id: "default" },
  });

  if (existing) {
    return existing;
  }

  // Register with Snaptrade
  const { data } = await snaptrade.authentication.registerSnapTradeUser({
    userId: SNAPTRADE_USER_ID,
  });

  const user = await prisma.snaptradeUser.create({
    data: {
      id: "default",
      snaptradeUserId: data.userId!,
      userSecret: data.userSecret!,
    },
  });

  return user;
}

export async function getSnaptradeConnectUrl(): Promise<{ url?: string; error?: string }> {
  try {
    if (!process.env.SNAPTRADE_CLIENT_ID || !process.env.SNAPTRADE_CONSUMER_KEY) {
      return { error: "SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY are not set on the server." };
    }

    const user = await getOrCreateSnaptradeUser();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data } = await snaptrade.authentication.loginSnapTradeUser({
      userId: user.snaptradeUserId,
      userSecret: user.userSecret,
      broker: "WEALTHSIMPLE",
      customRedirect: `${appUrl}/settings?connected=true`,
      connectionType: "read",
    });

    // SDK returns a union type; access the redirect URL safely
    const response = data as Record<string, unknown>;
    const redirectURI = response.redirectURI ?? response.loginRedirectURI ?? response.redirect_uri;
    if (!redirectURI) {
      return { error: `No redirect URL in Snaptrade response. Got keys: ${Object.keys(response).join(", ")}` };
    }
    return { url: String(redirectURI) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Snaptrade connect error:", message);
    return { error: message };
  }
}

export async function getSnaptradeConnections() {
  const user = await prisma.snaptradeUser.findUnique({
    where: { id: "default" },
  });

  if (!user) return [];

  try {
    const { data } = await snaptrade.connections.listBrokerageAuthorizations({
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
      await snaptrade.accountInformation.listUserAccounts({
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
          await snaptrade.accountInformation.getUserAccountPositions({
            userId: user.snaptradeUserId,
            userSecret: user.userSecret,
            accountId,
          });

        // Clear old positions for this account then re-insert
        await prisma.position.deleteMany({ where: { accountId } });

        for (const pos of holdings ?? []) {
          const symbol = pos.symbol?.symbol ?? pos.symbol?.raw_symbol ?? "UNKNOWN";
          const name = pos.symbol?.description ?? symbol;
          const units = pos.units ?? 0;
          const avgPrice = pos.average_purchase_price ?? 0;
          const currentPrice = pos.price ?? avgPrice;
          const bookValue = units * avgPrice;
          const marketValue = units * currentPrice;
          const gainLoss = marketValue - bookValue;
          const gainLossPct = bookValue > 0 ? (gainLoss / bookValue) * 100 : 0;

          // Upsert security
          if (pos.symbol?.id) {
            await prisma.security.upsert({
              where: { id: pos.symbol.id },
              create: {
                id: pos.symbol.id,
                symbol,
                name,
                type: pos.symbol.type?.code?.toLowerCase(),
                exchange: pos.symbol.exchange?.code,
                currency: pos.symbol.currency?.code ?? currency,
              },
              update: {
                name,
                type: pos.symbol.type?.code?.toLowerCase(),
                exchange: pos.symbol.exchange?.code,
              },
            });
          }

          await prisma.position.create({
            data: {
              accountId,
              securityId: pos.symbol?.id ?? null,
              symbol,
              name,
              quantity: units,
              bookValue,
              marketValue,
              gainLoss,
              gainLossPct,
              currency: pos.symbol?.currency?.code ?? currency,
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
          await snaptrade.transactionsAndReporting.getActivities({
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

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/holdings");
    revalidatePath("/performance");
    revalidatePath("/dividends");
    revalidatePath("/transactions");
    revalidatePath("/settings");

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
