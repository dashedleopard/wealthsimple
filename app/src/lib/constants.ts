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

// GICS Sector colors
export const SECTOR_COLORS: Record<string, string> = {
  Technology: "hsl(221, 83%, 53%)",
  "Financial Services": "hsl(142, 76%, 36%)",
  Healthcare: "hsl(340, 82%, 52%)",
  "Consumer Cyclical": "hsl(24, 95%, 53%)",
  "Communication Services": "hsl(262, 83%, 58%)",
  Industrials: "hsl(47, 96%, 53%)",
  "Consumer Defensive": "hsl(180, 70%, 45%)",
  Energy: "hsl(0, 84%, 60%)",
  Utilities: "hsl(280, 80%, 55%)",
  "Real Estate": "hsl(160, 60%, 45%)",
  "Basic Materials": "hsl(30, 70%, 50%)",
  Other: "hsl(200, 10%, 50%)",
};

// Geography colors
export const GEOGRAPHY_COLORS: Record<string, string> = {
  Canada: "hsl(0, 84%, 60%)",
  "United States": "hsl(221, 83%, 53%)",
  International: "hsl(142, 76%, 36%)",
  Other: "hsl(200, 10%, 50%)",
};

// Asset class colors
export const ASSET_CLASS_COLORS: Record<string, string> = {
  Equity: "hsl(221, 83%, 53%)",
  "Fixed Income": "hsl(142, 76%, 36%)",
  Cash: "hsl(47, 96%, 53%)",
  Crypto: "hsl(280, 80%, 55%)",
  "Real Estate": "hsl(160, 60%, 45%)",
  Other: "hsl(200, 10%, 50%)",
};

// Tax constants
export const TAXABLE_ACCOUNT_TYPES = ["NON_REG", "USD"];
export const CAPITAL_GAINS_INCLUSION_RATE = 0.5;
export const SUPERFICIAL_LOSS_WINDOW_DAYS = 30;
