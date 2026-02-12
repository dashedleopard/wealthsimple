import { Snaptrade } from "snaptrade-typescript-sdk";

const globalForSnaptrade = globalThis as unknown as {
  snaptrade: Snaptrade | undefined;
};

function createSnaptradeClient() {
  return new Snaptrade({
    consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
    clientId: process.env.SNAPTRADE_CLIENT_ID!,
  });
}

export const snaptrade =
  globalForSnaptrade.snaptrade ?? createSnaptradeClient();

if (process.env.NODE_ENV !== "production") {
  globalForSnaptrade.snaptrade = snaptrade;
}
