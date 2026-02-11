export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  TFSA: "TFSA",
  RRSP: "RRSP",
  FHSA: "FHSA",
  NON_REG: "Non-Registered",
  USD: "USD Non-Registered",
  RESP: "RESP",
  LIRA: "LIRA",
  CRYPTO: "Crypto",
};

export const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  TFSA: "hsl(142, 76%, 36%)",
  RRSP: "hsl(221, 83%, 53%)",
  FHSA: "hsl(262, 83%, 58%)",
  NON_REG: "hsl(24, 95%, 53%)",
  USD: "hsl(47, 96%, 53%)",
  RESP: "hsl(340, 82%, 52%)",
  LIRA: "hsl(180, 70%, 45%)",
  CRYPTO: "hsl(280, 80%, 55%)",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend",
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  fee: "Fee",
  transfer: "Transfer",
  interest: "Interest",
  contribution: "Contribution",
  refund: "Refund",
};

export const CHART_COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 76%, 36%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(47, 96%, 53%)",
  "hsl(340, 82%, 52%)",
  "hsl(180, 70%, 45%)",
  "hsl(280, 80%, 55%)",
];

export const DATE_RANGE_DAYS: Record<string, number | null> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  YTD: null, // calculated dynamically
  "1Y": 365,
  ALL: null,
};
