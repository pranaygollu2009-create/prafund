/**
 * Client access to live market data for the /markets page.
 *
 * Source: TradingView's public scanner endpoint. It is the one free quote
 * source that answers with proper CORS headers (echoing the page origin) and
 * serves stocks, ETFs, indexes and crypto in a single request, so a static
 * site can read real prices straight from the browser — no proxy, no API key.
 * The body is sent as `text/plain` on purpose: that keeps the POST a CORS
 * "simple" request, so no preflight is needed (the preflight response does not
 * allow a JSON content-type) and the scanner parses the JSON body regardless.
 *
 * If the network, the endpoint, or a symbol fails, the page still renders:
 * callers get a clearly-labelled practice simulation with `simulated: true`
 * so the UI can say the numbers are not real quotes.
 */
import { TICKERS } from "./market";

export type LiveQuote = {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
  price: number;
  change?: number;
  changePct?: number;
  open?: number;
  prevClose?: number;
  dayHigh?: number;
  dayLow?: number;
  high52?: number;
  low52?: number;
  volume?: number;
  avgVolume?: number;
  marketCap?: number;
  pe?: number;
  forwardPe?: number;
  eps?: number;
  divYield?: number;
  priceToBook?: number;
  earningsDate?: number;
  marketState?: string;
  currency?: string;
  time?: number;
};

export type ChartSeries = { points: { t: number; p: number }[]; prevClose: number | null };

/** `simulated` marks a fallback result: these are practice prices, not quotes. */
export type QuotesFeed = { quotes: LiveQuote[]; simulated: boolean };
export type ChartFeed = ChartSeries & { simulated: boolean };

const SCAN_URL = "https://scanner.tradingview.com/global/scan";
const TIMEOUT_MS = 10_000;

/** Quote fields followed by the history anchors used to draw the chart. */
const COLS = [
  "name",
  "description",
  "close",
  "change",
  "open",
  "high",
  "low",
  "volume",
  "average_volume_10d_calc",
  "market_cap_basic",
  "price_earnings_ttm",
  "earnings_per_share_basic_ttm",
  "dividends_yield_current",
  "price_book_fq",
  "earnings_release_next_date",
  "price_52_week_high",
  "price_52_week_low",
  "currency",
  "exchange",
  "close[1]",
  "close[2]",
  "change|5",
  "change|15",
  "change|30",
  "change|60",
  "change|120",
  "change|240",
  "Perf.W",
  "Perf.1M",
  "Perf.3M",
  "Perf.6M",
  "Perf.YTD",
  "Perf.Y",
  "Perf.5Y",
  "Perf.10Y",
] as const;

const IDX: Record<string, number> = Object.fromEntries(COLS.map((c, i) => [c, i]));
type Cell = string | number | null;

type Raw = {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
  currency?: string;
  price: number;
  changePct?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  avgVolume?: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  divYield?: number;
  priceToBook?: number;
  earningsDate?: number;
  high52?: number;
  low52?: number;
  prevCloses: (number | undefined)[]; // yesterday, day before
  changes: Record<number, number | undefined>; // % change over N minutes
  perf: Record<string, number | undefined>; // % change over named windows
};

/** Our Yahoo-style symbols -> the exchange-prefixed tickers the scanner uses. */
const FIXED_TICKER: Record<string, string> = {
  "^GSPC": "SP:SPX",
  "^DJI": "DJ:DJI",
  "^IXIC": "NASDAQ:IXIC",
  "^RUT": "TVC:RUT",
  "^VIX": "TVC:VIX",
  "BTC-USD": "CRYPTO:BTCUSD",
};

function tvCandidates(symbol: string): string[] {
  const fixed = FIXED_TICKER[symbol];
  if (fixed) return [fixed];
  const base = symbol.replace(/-/g, ".");
  return [`NASDAQ:${base}`, `NYSE:${base}`, `AMEX:${base}`];
}

const num = (v: Cell): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const text = (v: Cell): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;
const round2 = (n: number) => Math.round(n * 100) / 100;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** New York wall clock, so session times are right regardless of the viewer's zone. */
function nyClock(t: number): { weekend: boolean; mins: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(t));
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  const wd = get("weekday");
  const hour = Number(get("hour")) % 24;
  return { weekend: wd === "Sat" || wd === "Sun", mins: hour * 60 + Number(get("minute")) };
}

/** True while the NYSE/Nasdaq regular session is open (holidays ignored). */
function usMarketOpen(now = Date.now()): boolean {
  const c = nyClock(now);
  return !c.weekend && c.mins >= 570 && c.mins < 960; // 09:30–16:00 ET
}

/**
 * Timestamp of the latest regular-session close — i.e. when the quotes we get
 * were last true. Before the open or at a weekend it steps back to the last
 * weekday's 16:00 New York time, so "as of" never claims a live price.
 */
function lastSessionEnd(now = Date.now()): number {
  const c = nyClock(now);
  if (!c.weekend && c.mins >= 570 && c.mins < 960) return now;
  if (!c.weekend && c.mins >= 960) return now - (c.mins - 960) * MIN;
  // Weekend or pre-market: step back to the nearest weekday and pin it to
  // that day's 16:00 New York close.
  let t = now;
  for (let i = 0; i < 9; i++) {
    t -= DAY;
    const p = nyClock(t);
    if (p.weekend) continue;
    return p.mins >= 960 ? t - (p.mins - 960) * MIN : t + (960 - p.mins) * MIN;
  }
  return now;
}

/** One scanner request for every symbol the page shows. */
async function scan(symbols: string[]): Promise<Raw[]> {
  const tickerToSymbol = new Map<string, string>();
  for (const s of symbols) {
    for (const t of tvCandidates(s)) if (!tickerToSymbol.has(t)) tickerToSymbol.set(t, s);
  }
  if (!tickerToSymbol.size) return [];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SCAN_URL, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({
        symbols: { tickers: [...tickerToSymbol.keys()], query: { types: [] } },
        columns: COLS,
        ignore_unknown_symbols: true,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Market data returned ${res.status}`);
    const json = (await res.json()) as { data?: { s: string; d: Cell[] }[] };
    const rows: Raw[] = [];
    for (const row of json.data ?? []) {
      const symbol = tickerToSymbol.get(row.s);
      if (!symbol) continue;
      const d = row.d ?? [];
      const at = (col: string): Cell => d[IDX[col] ?? -1] ?? null;
      const price = num(at("close"));
      if (price === undefined || price <= 0) continue;
      rows.push({
        symbol,
        name: text(at("description")) ?? text(at("name")) ?? symbol,
        ...(text(at("type")) ? { type: text(at("type"))! } : {}),
        ...(text(at("exchange")) ? { exchange: text(at("exchange"))! } : {}),
        ...(text(at("currency")) ? { currency: text(at("currency"))! } : {}),
        price,
        ...(num(at("change")) !== undefined ? { changePct: num(at("change"))! } : {}),
        ...(num(at("open")) !== undefined ? { open: num(at("open"))! } : {}),
        ...(num(at("high")) !== undefined ? { dayHigh: num(at("high"))! } : {}),
        ...(num(at("low")) !== undefined ? { dayLow: num(at("low"))! } : {}),
        ...(num(at("volume")) !== undefined ? { volume: num(at("volume"))! } : {}),
        ...(num(at("average_volume_10d_calc")) !== undefined
          ? { avgVolume: num(at("average_volume_10d_calc"))! }
          : {}),
        ...(num(at("market_cap_basic")) !== undefined
          ? { marketCap: num(at("market_cap_basic"))! }
          : {}),
        ...(num(at("price_earnings_ttm")) !== undefined
          ? { pe: num(at("price_earnings_ttm"))! }
          : {}),
        ...(num(at("earnings_per_share_basic_ttm")) !== undefined
          ? { eps: num(at("earnings_per_share_basic_ttm"))! }
          : {}),
        ...(num(at("dividends_yield_current")) !== undefined
          ? { divYield: num(at("dividends_yield_current"))! }
          : {}),
        ...(num(at("price_book_fq")) !== undefined
          ? { priceToBook: num(at("price_book_fq"))! }
          : {}),
        ...(num(at("earnings_release_next_date")) !== undefined
          ? { earningsDate: num(at("earnings_release_next_date"))! }
          : {}),
        ...(num(at("price_52_week_high")) !== undefined
          ? { high52: num(at("price_52_week_high"))! }
          : {}),
        ...(num(at("price_52_week_low")) !== undefined
          ? { low52: num(at("price_52_week_low"))! }
          : {}),
        prevCloses: [num(at("close[1]")), num(at("close[2]"))],
        changes: {
          5: num(at("change|5")),
          15: num(at("change|15")),
          30: num(at("change|30")),
          60: num(at("change|60")),
          120: num(at("change|120")),
          240: num(at("change|240")),
        },
        perf: {
          W: num(at("Perf.W")),
          "1M": num(at("Perf.1M")),
          "3M": num(at("Perf.3M")),
          "6M": num(at("Perf.6M")),
          YTD: num(at("Perf.YTD")),
          Y: num(at("Perf.Y")),
          "5Y": num(at("Perf.5Y")),
          "10Y": num(at("Perf.10Y")),
        },
      });
    }
    if (!rows.length) throw new Error("Market data returned no quotes.");
    return rows;
  } finally {
    clearTimeout(timer);
  }
}

let cache: { at: number; bySymbol: Map<string, Raw> } | null = null;

async function snapshot(symbols: string[], maxAgeMs: number): Promise<Map<string, Raw>> {
  if (cache && Date.now() - cache.at <= maxAgeMs) {
    const missing = symbols.filter((s) => !cache!.bySymbol.has(s));
    if (!missing.length) return cache.bySymbol;
  }
  const rows = await scan(symbols);
  const bySymbol = new Map(rows.map((r) => [r.symbol, r] as const));
  cache = { at: Date.now(), bySymbol };
  return bySymbol;
}

function toQuote(r: Raw, sessionOpen: boolean, asOf: number): LiveQuote {
  const pct = r.changePct;
  const prevClose =
    pct !== undefined && pct > -100 ? r.price / (1 + pct / 100) : undefined;
  const change = prevClose !== undefined ? round2(r.price - prevClose) : undefined;
  return {
    symbol: r.symbol,
    name: r.name,
    ...(r.type ? { type: r.type.toUpperCase() } : {}),
    ...(r.exchange ? { exchange: r.exchange } : {}),
    price: r.price,
    ...(change !== undefined ? { change } : {}),
    ...(pct !== undefined ? { changePct: pct } : {}),
    ...(r.open !== undefined ? { open: r.open } : {}),
    ...(prevClose !== undefined ? { prevClose: round2(prevClose) } : {}),
    ...(r.dayHigh !== undefined ? { dayHigh: r.dayHigh } : {}),
    ...(r.dayLow !== undefined ? { dayLow: r.dayLow } : {}),
    ...(r.high52 !== undefined ? { high52: r.high52 } : {}),
    ...(r.low52 !== undefined ? { low52: r.low52 } : {}),
    ...(r.volume !== undefined ? { volume: r.volume } : {}),
    ...(r.avgVolume !== undefined ? { avgVolume: r.avgVolume } : {}),
    ...(r.marketCap !== undefined ? { marketCap: r.marketCap } : {}),
    ...(r.pe !== undefined ? { pe: r.pe } : {}),
    ...(r.eps !== undefined ? { eps: r.eps } : {}),
    ...(r.divYield !== undefined ? { divYield: r.divYield } : {}),
    ...(r.priceToBook !== undefined ? { priceToBook: r.priceToBook } : {}),
    ...(r.earningsDate !== undefined ? { earningsDate: r.earningsDate } : {}),
    marketState: sessionOpen ? "REGULAR" : "CLOSED",
    ...(r.currency ? { currency: r.currency } : {}),
    time: asOf,
  };
}

/**
 * Chart series from real closes at real moments: the session's 5/15/30/60/120/
 * 240-minute changes for intraday, plus the last two daily closes and the
 * 1W/1M/3M/6M/YTD/1Y/5Y/10Y returns for longer ranges. TradingView's public
 * feed exposes these anchors rather than a raw candlestick series, so long
 * ranges are drawn as a coarse (but genuine) line between them.
 */
function buildSeries(r: Raw, range: string): ChartSeries {
  // Anchor the series at the last trade, not at "now", so a weekend or a
  // pre-market visit does not stretch the line past the session close.
  const now = lastSessionEnd();
  const at = (pct: number | undefined): number | undefined =>
    pct !== undefined && pct > -100 ? r.price / (1 + pct / 100) : undefined;
  const points: { t: number; p: number }[] = [];
  const push = (t: number, p: number | undefined) => {
    if (p !== undefined && Number.isFinite(p) && p > 0) points.push({ t, p: round2(p) });
  };
  const p = r.perf;

  if (range === "1d") {
    push(now - 390 * MIN, r.open); // one trading session back = the open
    for (const mins of [240, 120, 60, 30, 15, 5]) push(now - mins * MIN, at(r.changes[mins]));
  } else if (range === "5d") {
    push(now - 7 * DAY, at(p["W"]));
    push(now - 2 * DAY, r.prevCloses[1]);
    push(now - 1 * DAY, r.prevCloses[0]);
  } else if (range === "1mo") {
    push(now - 30 * DAY, at(p["1M"]));
    push(now - 7 * DAY, at(p["W"]));
    push(now - 1 * DAY, r.prevCloses[0]);
  } else if (range === "6mo") {
    push(now - 183 * DAY, at(p["6M"]));
    push(now - 91 * DAY, at(p["3M"]));
    push(now - 30 * DAY, at(p["1M"]));
    push(now - 7 * DAY, at(p["W"]));
  } else if (range === "ytd") {
    const jan1 = new Date(new Date().getFullYear(), 0, 1).getTime();
    push(Math.min(jan1, now - 300 * DAY), at(p["YTD"]));
    push(now - 91 * DAY, at(p["3M"]));
    push(now - 30 * DAY, at(p["1M"]));
    push(now - 7 * DAY, at(p["W"]));
  } else if (range === "1y") {
    push(now - 365 * DAY, at(p["Y"]));
    push(now - 183 * DAY, at(p["6M"]));
    push(now - 91 * DAY, at(p["3M"]));
    push(now - 30 * DAY, at(p["1M"]));
  } else if (range === "5y") {
    push(now - 1825 * DAY, at(p["5Y"]));
    push(now - 365 * DAY, at(p["Y"]));
    push(now - 183 * DAY, at(p["6M"]));
    push(now - 30 * DAY, at(p["1M"]));
  } else {
    push(now - 3650 * DAY, at(p["10Y"]));
    push(now - 1825 * DAY, at(p["5Y"]));
    push(now - 365 * DAY, at(p["Y"]));
    push(now - 91 * DAY, at(p["3M"]));
    push(now - 30 * DAY, at(p["1M"]));
  }
  push(now, r.price);
  points.sort((a, b) => a.t - b.t);

  const prevClose =
    r.changePct !== undefined && r.changePct > -100
      ? round2(r.price / (1 + r.changePct / 100))
      : points[0]?.p ?? null;
  return { points, prevClose };
}

/* ------------------------------------------------------------------ */
/* Offline fallback: deterministic practice prices                     */
/* ------------------------------------------------------------------ */

const KNOWN = new Map(TICKERS.map((t) => [t.symbol, t] as const));

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedFor(symbol: string): { price: number; vol: number } {
  const known = KNOWN.get(symbol);
  if (known) return { price: known.start, vol: known.vol };
  const h = hash(symbol);
  return { price: 20 + (h % 480) + ((h >>> 9) % 100) / 100, vol: 0.35 };
}

/** Deterministic random-walk series, seeded by symbol + range. */
function simSeries(symbol: string, count: number, stepMs: number, range: string) {
  const { price, vol } = seedFor(symbol);
  const r = rand(hash(symbol + "|" + range));
  const now = Date.now();
  const dtYears = Math.min(0.02, stepMs / (1000 * 60 * 60 * 6.5 * 252));
  const points: { t: number; p: number }[] = [];
  let p = price * (0.97 + r() * 0.06);
  for (let i = count - 1; i >= 0; i--) {
    const u = r() || 1e-9;
    const v = r() || 1e-9;
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    p = Math.max(1, p * Math.exp(-0.5 * vol * vol * dtYears + vol * Math.sqrt(dtYears) * z));
    points.push({ t: now - i * stepMs, p: round2(p) });
  }
  return points;
}

const RANGE_SIM: Record<string, { count: number; stepMs: number }> = {
  "1d": { count: 78, stepMs: 5 * MIN },
  "5d": { count: 65, stepMs: 30 * MIN },
  "1mo": { count: 22, stepMs: DAY },
  "6mo": { count: 26, stepMs: 7 * DAY },
  ytd: { count: 46, stepMs: 7 * DAY },
  "1y": { count: 52, stepMs: 7 * DAY },
  "5y": { count: 60, stepMs: 30 * DAY },
  max: { count: 84, stepMs: 30 * DAY },
};

function simulatedQuotes(symbols: string[]): LiveQuote[] {
  return symbols.map((symbol) => {
    const points = simSeries(symbol, 40, 5 * MIN, "1d");
    const first = points[0]?.p ?? 0;
    const last = points[points.length - 1]?.p ?? first;
    const change = round2(last - first);
    return {
      symbol,
      name: KNOWN.get(symbol)?.name ?? symbol,
      type: symbol.startsWith("^") ? "INDEX" : "EQUITY",
      exchange: symbol.startsWith("^") ? "Index" : KNOWN.get(symbol)?.kind === "crypto" ? "Crypto" : "Practice data",
      price: last,
      change,
      changePct: round2(first ? (change / first) * 100 : 0),
      prevClose: first,
      marketState: "CLOSED",
      currency: "USD",
      time: Math.floor(Date.now() / 1000),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function fetchLiveQuotes(symbols: string[]): Promise<QuotesFeed> {
  try {
    const map = await snapshot(symbols, 5_000);
    const sessionOpen = usMarketOpen();
    const asOf = Math.floor(lastSessionEnd() / 1000);
    const quotes = symbols
      .map((s) => map.get(s))
      .filter((r): r is Raw => Boolean(r))
      .map((r) => toQuote(r, sessionOpen, asOf));
    if (!quotes.length) throw new Error("Market data returned no quotes.");
    return { quotes, simulated: false };
  } catch {
    return { quotes: simulatedQuotes(symbols), simulated: true };
  }
}

export async function fetchLiveChart(symbol: string, range: string): Promise<ChartFeed> {
  try {
    const map = await snapshot([symbol], 60_000);
    const row = map.get(symbol);
    if (!row) throw new Error("No chart data for this symbol.");
    const series = buildSeries(row, range);
    if (series.points.length < 2) throw new Error("No chart data for this period.");
    return { ...series, simulated: false };
  } catch {
    const cfg = RANGE_SIM[range] ?? RANGE_SIM["1d"]!;
    const points = simSeries(symbol, cfg.count, cfg.stepMs, range);
    return { points, prevClose: points[0]?.p ?? null, simulated: true };
  }
}
