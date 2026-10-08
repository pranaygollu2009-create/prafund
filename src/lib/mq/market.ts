/**
 * Market data layer.
 *
 * Live mode: real quotes for real companies, fetched from our Supabase Edge
 * Function (`market-quotes`), which proxies Yahoo Finance server-side (Yahoo
 * does not send CORS headers, so the browser cannot call it directly).
 * Configure the function URL in VITE_MARKET_QUOTES_URL.
 *
 * Fallback mode: when the feed is not configured or unreachable, prices come
 * from a random-walk (geometric Brownian motion) simulation seeded near each
 * ticker's recent level, so the app never breaks. The UI labels which mode is
 * active — never present simulated prices as real.
 */

export type Ticker = {
  symbol: string;
  name: string;
  kind: "stock" | "fund" | "bond" | "crypto";
  sector?: string;
  /** Fallback-simulation only: seed price and assumed annual drift/volatility. */
  start: number;
  drift: number;
  vol: number;
};

export const TICKERS: Ticker[] = [
  {
    symbol: "^GSPC",
    name: "S&P 500 Index",
    kind: "fund",
    sector: "500 large US companies",
    start: 7800,
    drift: 0.08,
    vol: 0.15,
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    kind: "stock",
    sector: "Technology",
    start: 337,
    drift: 0.1,
    vol: 0.28,
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    kind: "stock",
    sector: "Software",
    start: 505,
    drift: 0.11,
    vol: 0.3,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    kind: "stock",
    sector: "Semiconductors",
    start: 190,
    drift: 0.14,
    vol: 0.55,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    kind: "stock",
    sector: "Technology",
    start: 250,
    drift: 0.11,
    vol: 0.32,
  },
  {
    symbol: "META",
    name: "Meta Platforms, Inc.",
    kind: "stock",
    sector: "Technology",
    start: 750,
    drift: 0.12,
    vol: 0.38,
  },
  {
    symbol: "AMZN",
    name: "Amazon.com, Inc.",
    kind: "stock",
    sector: "E-commerce",
    start: 245,
    drift: 0.1,
    vol: 0.34,
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    kind: "stock",
    sector: "Automotive",
    start: 430,
    drift: 0.09,
    vol: 0.62,
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    kind: "stock",
    sector: "Banking",
    start: 300,
    drift: 0.07,
    vol: 0.24,
  },
  {
    symbol: "V",
    name: "Visa Inc.",
    kind: "stock",
    sector: "Payments",
    start: 350,
    drift: 0.08,
    vol: 0.22,
  },
  {
    symbol: "WMT",
    name: "Walmart Inc.",
    kind: "stock",
    sector: "Retail",
    start: 105,
    drift: 0.06,
    vol: 0.2,
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices, Inc.",
    kind: "stock",
    sector: "Semiconductors",
    start: 230,
    drift: 0.12,
    vol: 0.55,
  },
  {
    symbol: "JNJ",
    name: "Johnson & Johnson",
    kind: "stock",
    sector: "Healthcare",
    start: 195,
    drift: 0.05,
    vol: 0.22,
  },
  {
    symbol: "UNH",
    name: "UnitedHealth Group Incorporated",
    kind: "stock",
    sector: "Healthcare",
    start: 350,
    drift: 0.06,
    vol: 0.3,
  },
  {
    symbol: "NFLX",
    name: "Netflix, Inc.",
    kind: "stock",
    sector: "Entertainment",
    start: 1200,
    drift: 0.09,
    vol: 0.4,
  },
  {
    symbol: "DIS",
    name: "The Walt Disney Company",
    kind: "stock",
    sector: "Entertainment",
    start: 115,
    drift: 0.06,
    vol: 0.32,
  },
  {
    symbol: "KO",
    name: "The Coca-Cola Company",
    kind: "stock",
    sector: "Consumer staples",
    start: 70,
    drift: 0.05,
    vol: 0.16,
  },
  {
    symbol: "T",
    name: "AT&T Inc.",
    kind: "stock",
    sector: "Telecom",
    start: 28,
    drift: 0.04,
    vol: 0.2,
  },
  {
    symbol: "DAL",
    name: "Delta Air Lines, Inc.",
    kind: "stock",
    sector: "Travel",
    start: 60,
    drift: 0.06,
    vol: 0.48,
  },
  {
    symbol: "MAR",
    name: "Marriott International, Inc.",
    kind: "stock",
    sector: "Travel",
    start: 280,
    drift: 0.05,
    vol: 0.36,
  },
  {
    symbol: "CAT",
    name: "Caterpillar Inc.",
    kind: "stock",
    sector: "Industrials",
    start: 550,
    drift: 0.055,
    vol: 0.3,
  },
  {
    symbol: "NEE",
    name: "NextEra Energy, Inc.",
    kind: "stock",
    sector: "Utilities",
    start: 85,
    drift: 0.035,
    vol: 0.14,
  },
  {
    symbol: "FCX",
    name: "Freeport-McMoRan Inc.",
    kind: "stock",
    sector: "Mining",
    start: 45,
    drift: 0.04,
    vol: 0.42,
  },
  {
    symbol: "FSLR",
    name: "First Solar, Inc.",
    kind: "stock",
    sector: "Energy tech",
    start: 230,
    drift: 0.12,
    vol: 0.58,
  },
  {
    symbol: "UPS",
    name: "United Parcel Service, Inc.",
    kind: "stock",
    sector: "Logistics",
    start: 90,
    drift: 0.065,
    vol: 0.26,
  },
  {
    symbol: "PLTR",
    name: "Palantir Technologies Inc.",
    kind: "stock",
    sector: "Technology",
    start: 194,
    drift: 0.15,
    vol: 0.65,
  },
  {
    symbol: "PLD",
    name: "Prologis, Inc.",
    kind: "stock",
    sector: "Real estate",
    start: 115,
    drift: 0.04,
    vol: 0.24,
  },
  {
    symbol: "VOO",
    name: "Vanguard S&P 500 ETF",
    kind: "fund",
    sector: "Broad US market",
    start: 615,
    drift: 0.08,
    vol: 0.15,
  },
  {
    symbol: "VT",
    name: "Vanguard Total World Stock ETF",
    kind: "fund",
    sector: "World equity",
    start: 130,
    drift: 0.07,
    vol: 0.17,
  },
  {
    symbol: "VWO",
    name: "Vanguard Emerging Markets Stock ETF",
    kind: "fund",
    sector: "Emerging markets",
    start: 56,
    drift: 0.06,
    vol: 0.24,
  },
  {
    symbol: "VNQ",
    name: "Vanguard Real Estate ETF",
    kind: "fund",
    sector: "Real estate",
    start: 92,
    drift: 0.05,
    vol: 0.19,
  },
  {
    symbol: "GLD",
    name: "SPDR Gold Shares",
    kind: "fund",
    sector: "Gold",
    start: 376,
    drift: 0.04,
    vol: 0.2,
  },
  {
    symbol: "BIL",
    name: "SPDR Bloomberg 1-3 Month T-Bill ETF",
    kind: "bond",
    sector: "T-Bills",
    start: 91.5,
    drift: 0.02,
    vol: 0.02,
  },
  {
    symbol: "BND",
    name: "Vanguard Total Bond Market ETF",
    kind: "bond",
    sector: "US bonds",
    start: 74,
    drift: 0.03,
    vol: 0.06,
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    kind: "crypto",
    sector: "Crypto",
    start: 83000,
    drift: 0.12,
    vol: 1.1,
  },
];

export const TICKER_SYMBOLS = TICKERS.map((t) => t.symbol);

/** URL of the `market-quotes` Supabase Edge Function (empty = simulation only). */
export const LIVE_QUOTES_URL: string =
  (import.meta.env["VITE_MARKET_QUOTES_URL"] as string | undefined)?.trim() ?? "";

export type Quote = {
  symbol: string;
  name: string;
  kind: Ticker["kind"];
  price: number;
  open: number;
  change: number;
  changePct: number;
  points: { t: number; p: number }[];
  prevClose?: number;
  currency?: string;
  exchange?: string;
  high52?: number;
  low52?: number;
};

export type MarketSnapshot = {
  quotes: Quote[];
  updatedAt: number;
};

/* ------------------------------------------------------------------ */
/* Fallback simulation                                                 */
/* ------------------------------------------------------------------ */

/** One simulated tick, `dtYears` of market time. */
function step(price: number, drift: number, vol: number, dtYears: number) {
  const u = Math.random() || 1e-9;
  const v = Math.random() || 1e-9;
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const next = price * Math.exp((drift - (vol * vol) / 2) * dtYears + vol * Math.sqrt(dtYears) * z);
  return Math.max(0.5, next);
}

/** Seeds a plausible session history so charts are never empty on first paint. */
export function seedMarket(pointsPerSeries = 64, dtYears = 1 / (252 * 26)): MarketSnapshot {
  const now = Date.now();
  const quotes = TICKERS.map((t) => {
    let p = t.start;
    const points: { t: number; p: number }[] = [];
    for (let i = pointsPerSeries - 1; i >= 0; i--) {
      p = step(p, t.drift, t.vol, dtYears);
      points.push({ t: now - i * 3000, p: round(p) });
    }
    const open = points[0]!.p;
    const price = points[points.length - 1]!.p;
    return {
      symbol: t.symbol,
      name: t.name,
      kind: t.kind,
      price,
      open,
      change: round(price - open),
      changePct: round(((price - open) / open) * 100),
      points,
    };
  });
  return { quotes, updatedAt: now };
}

export function tickMarket(
  prev: MarketSnapshot,
  maxPoints = 64,
  dtYears = 1 / (252 * 26),
): MarketSnapshot {
  const now = Date.now();
  const quotes = prev.quotes.map((q) => {
    const meta = TICKERS.find((t) => t.symbol === q.symbol);
    if (!meta) return q;
    const price = round(step(q.price, meta.drift, meta.vol, dtYears));
    const points = [...q.points, { t: now, p: price }].slice(-maxPoints);
    return {
      ...q,
      price,
      points,
      change: round(price - q.open),
      changePct: round(((price - q.open) / q.open) * 100),
    };
  });
  return { quotes, updatedAt: now };
}

/* ------------------------------------------------------------------ */
/* Live feed (Supabase Edge Function proxying Yahoo Finance)           */
/* ------------------------------------------------------------------ */

type LiveQuote = {
  s: string;
  price: number;
  change?: number;
  changePct?: number;
  prevClose?: number;
  currency?: string;
  exchange?: string;
  high52?: number;
  low52?: number;
  points: [number, number][];
};

export async function fetchLiveSnapshot(
  symbols: string[] = TICKER_SYMBOLS,
): Promise<MarketSnapshot> {
  if (!LIVE_QUOTES_URL)
    throw new Error("Live market feed is not configured (VITE_MARKET_QUOTES_URL).");
  const sep = LIVE_QUOTES_URL.includes("?") ? "&" : "?";
  const res = await fetch(
    `${LIVE_QUOTES_URL}${sep}symbols=${encodeURIComponent(symbols.join(","))}`,
  );
  if (!res.ok) throw new Error(`Market feed returned ${res.status}`);
  const data = (await res.json()) as { quotes?: LiveQuote[]; updatedAt?: number };
  if (!data?.quotes?.length) throw new Error("Market feed returned no quotes.");

  const quotes: Quote[] = [];
  for (const q of data.quotes) {
    const meta = TICKERS.find((t) => t.symbol === q.s);
    if (!meta) continue;
    const points = q.points
      .filter(([, p]) => Number.isFinite(p) && p > 0)
      .slice(-90)
      .map(([t, p]) => ({ t, p: round(p) }));
    if (points.length < 2 || !Number.isFinite(q.price)) continue;
    const open = points[0]!.p;
    quotes.push({
      symbol: meta.symbol,
      name: meta.name,
      kind: meta.kind,
      price: round(q.price),
      open,
      change: round(q.change ?? q.price - open),
      changePct: round(q.changePct ?? ((q.price - open) / open) * 100),
      points,
      ...(q.prevClose != null ? { prevClose: round(q.prevClose) } : {}),
      ...(q.currency ? { currency: q.currency } : {}),
      ...(q.exchange ? { exchange: q.exchange } : {}),
      ...(q.high52 != null ? { high52: round(q.high52) } : {}),
      ...(q.low52 != null ? { low52: round(q.low52) } : {}),
    });
  }
  if (!quotes.length) throw new Error("Market feed had no known symbols.");
  return { quotes, updatedAt: data.updatedAt ?? Date.now() };
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export const round = (n: number) => Math.round(n * 100) / 100;

export const priceLabel = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pctLabel = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

/** Simple equal-weight index across everything, so the tape has a headline number. */
export function marketIndex(snap: MarketSnapshot) {
  const pct = snap.quotes.reduce((a, q) => a + q.changePct, 0) / (snap.quotes.length || 1);
  return round(pct);
}
