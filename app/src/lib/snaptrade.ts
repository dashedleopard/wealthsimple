import { Snaptrade } from "snaptrade-typescript-sdk";

let _client: Snaptrade | null = null;

export function getSnaptradeClient(): Snaptrade {
  if (!_client) {
    const clientId = process.env.SNAPTRADE_CLIENT_ID?.trim();
    const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY?.trim();

    if (!clientId || !consumerKey) {
      throw new Error(
        `Snaptrade credentials missing. CLIENT_ID: ${clientId ? "set" : "MISSING"}, CONSUMER_KEY: ${consumerKey ? "set" : "MISSING"}`
      );
    }

    _client = new Snaptrade({ consumerKey, clientId });
  }
  return _client;
}
