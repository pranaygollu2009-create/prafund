// Supabase Edge Function: market-quotes
//
// GET /functions/v1/market-quotes?symbols=AAPL,MSFT
//   -> old (snapshot) mode: intraday 1d/5m chart points + quote per symbol.
// GET /functions/v1/market-quotes?batch=AAPL,MSFT,...
//   -> rich bulk quotes: price + stats (market cap, P/E, EPS, 52-week range,
//      volume, earnings date).
// GET /functions/v1/market-quotes?chart=1&symbol=AAPL&range=1mo
//   -> chart series ({points:[{t,p}], prevClose}) for the selected range.
// GET /functions/v1/market-quotes?debug=1
//   -> upstream diagnostics (no credentials exposed).
//
// Prices come from Yahoo Finance's chart endpoint server-side (Yahoo does
// not send CORS headers, so browsers cannot call it directly). Statistics
// come from Yahoo's v7 quote endpoint when reachable, falling back to
// TradingView's public scanner (same underlying fundamentals). Both are
// cached in-memory so many clients polling stay cheap.

const DEFAULT_SYMBOLS = [
  "^GSPC", "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "JPM",
  "V", "WMT", "XOM", "UNH", "JNJ", "^IXIC", "BTC-USD",
];

const TTL_MS = 45_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36";
const HOSTS = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

let debugInfo: Record<string, unknown> | null = null;

// ---------------------------------------------------------------- yahoo crumb
type Crumb = { cookie: string; crumb: string; at: number };
let crumbSession: Crumb | null = null;
const CRUMB_TTL_MS = 3 * 60 * 60 * 1000; // 3h

async function getCrumbSession(): Promise<Crumb | null> {
  if (crumbSession && Date.now() - crumbSession.at < CRUMB_TTL_MS) {
    return { cookie: crumbSession.cookie, crumb: crumbSession.crumb };
  }
  try {
    // Manually follow the fc.yahoo redirect chain, collecting A3/A1 cookies
    // from every hop (redirect:"follow" drops per-hop set-cookie headers).
    let hopUrl = "https://fc.yahoo.com";
    let cookiePairs = "";
    const hopStatuses: number[] = [];
    for (let hop = 0; hop < 4 && hopUrl; hop++) {
      const rh = await fetch(hopUrl, {
        headers: { "user-agent": UA },
        redirect: "manual",
      });
      hopStatuses.push(rh.status);
      const raw =
        typeof (rh.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function"
          ? (rh.headers as { getSetCookie: () => string[] }).getSetCookie()
          : [rh.headers.get("set-cookie") ?? ""];
      const pairs = raw.map((c) => c.split(";")[0].trim()).filter(Boolean);
      if (pairs.length) {
        const names = new Set(pairs.map((p) => p.split("=")[0]!.toLowerCase()));
        cookiePairs = cookiePairs
          .split("; ")
          .filter(Boolean)
          .filter((p) => !names.has(p.split("=")[0]!.toLowerCase()))
          .concat(pairs)
          .join("; ");
      }
      if (rh.status >= 300 && rh.status < 400) {
        const loc = rh.headers.get("location");
        hopUrl = loc && loc.startsWith("http") ? loc : null;
      } else {
        hopUrl = null;
      }
    }
    const crumbStatuses: number[] = [];
    let crumb = "";
    for (const ch of HOSTS) {
      const rr = await fetch(`https://${ch}/v1/test/getcrumb`, {
        headers: {
          "user-agent": UA,
          accept: "application/json",
          ...(cookiePairs ? { cookie: cookiePairs } : {}),
        },
      });
      crumbStatuses.push(rr.status);
      const t = (await rr.text()).trim();
      if (rr.ok && t && t.length <= 30 && !t.startsWith("\"")) {
        crumb = t;
        break;
      }
    }
    debugInfo = { hopStatuses, crumbStatuses, crumbLen: crumb.length, v7: "pending" };
    if (!crumb) {
      return crumbSession ? { cookie: crumbSession.cookie, crumb: crumbSession.crumb } : null;
    }
    crumbSession = { cookie: cookiePairs, crumb, at: Date.now() };
    return { cookie: cookiePairs, crumb };
  } catch (e) {
    debugInfo = { error: e instanceof Error ? e.message : "unknown" };
    return crumbSession ? { cookie: crumbSession.cookie, crumb: crumbSession.crumb } : null;
  }
}

function cors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "authorization, x-client-info, apikey, content-type");
  return new Response(res.body, { status: res.status, headers });
}

type RichQuote = Record<string, unknown> & { symbol: string };

// ---------------------------------------------------------------- yahoo v7
async function fetchYahooV7(symbols: string[]): Promise<RichQuote[]> {
  const session = await getCrumbSession();
  if (!session) return [];
  for (const host of HOSTS) {
    try {
      const url =
        `https://${host}/v7/finance/quote?symbols=` +
        encodeURIComponent(symbols.join(",")) +
        "&crumb=" +
        encodeURIComponent(session.crumb);
      const res = await fetch(url, {
        headers: {
          "user-agent": UA,
          accept: "application/json",
          cookie: session.cookie,
        },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { quoteResponse?: { result?: RichQuote[] } };
      const r = (json?.quoteResponse?.result ?? []) as RichQuote[];
      if (r.length) debugInfo = { ...(debugInfo ?? {}), v7: "ok" };
      return r;
    } catch {
      // try next host
    }
  }
  if (debugInfo) debugInfo = { ...(debugInfo ?? {}), v7: "failed" };
  return [];
}

// ---------------------------------------------------------------- tradingview fallback
const tvCache = new Map<string, { at: number; q: RichQuote }>();
const TV_TTL_MS = 15 * 60 * 1000;

const TV_COLUMNS = [
  "market_cap_basic", "price_earnings_ttm", "earnings_per_share_basic_ttm",
  "dividends_yield_current", "price_book_fq", "volume",
  "average_volume_10d_calc", "price_52_week_high", "price_52_week_low",
  "earnings_release_next_date", "sector", "name", "exchange",
];

function tvTickerCandidates(symbol: string, hint?: string): string[] {
  if (/[^A-Z0-9.\-]/.test(symbol)) return []; // indexes / crypto have no TV basic tickers here
  const h = (hint ?? "").toLowerCase();
  const prefixes: string[] = [];
  if (h.includes("nasdaq")) prefixes.push("NASDAQ");
  if (h.includes("nyse")) prefixes.push("NYSE", "AMEX");
  if (prefixes.length === 0) prefixes.push("NASDAQ", "NYSE", "AMEX");
  return [...new Set(prefixes.map((p) => `${p}:${symbol}`))];
}

async function fetchTvRich(
  symbols: string[],
  hints: Map<string, string | undefined>,
): Promise<Map<string, RichQuote>> {
  const out = new Map<string, RichQuote>();
  const need: string[] = [];
  for (const s of symbols) {
    const hit = tvCache.get(s);
    if (hit && Date.now() - hit.at < TV_TTL_MS) out.set(s, hit.q);
    else need.push(s);
  }
  if (!need.length) return out;

  // Build the candidate ticker list, remembering which yahoo symbol each
  // candidate maps to.
  const tickerMap = new Map<string, string>();
  for (const s of need) {
    for (const t of tvTickerCandidates(s, hints.get(s))) {
      if (!tickerMap.has(t)) tickerMap.set(t, s);
    }
  }
  if (tickerMap.size === 0) return out;

  try {
    const res = await fetch("https://scanner.tradingview.com/america/scan", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({
        symbols: { tickers: [...tickerMap.keys()], query: { types: [] } },
        columns: TV_COLUMNS,
        ignore_unknown_symbols: true,
      }),
    });
    if (!res.ok) return out;
    const json = (await res.json()) as { data?: { s: string; d: unknown[] }[] };
    const now = Date.now();
    for (const row of json.data ?? []) {
      const yahooSymbol = tickerMap.get(row.s);
      if (!yahooSymbol) continue;
      const d = row.d ?? [];
      const cap = typeof d[0] === "number" ? d[0] : undefined;
      if (cap === undefined) continue;
      const q: RichQuote = {
        symbol: yahooSymbol,
        marketCap: cap,
        ...((typeof d[1] === "number" ? { trailingPE: d[1] } : {})),
        ...((typeof d[2] === "number" ? { epsTrailingTwelveMonths: d[2] } : {})),
        ...((typeof d[3] === "number" ? { dividendYield: d[3] } : {})),
        ...((typeof d[4] === "number" ? { priceToBook: d[4] } : {})),
        ...((typeof d[5] === "number" ? { regularMarketVolume: d[5] } : {})),
        ...((typeof d[6] === "number" ? { averageDailyVolume3Month: d[6] } : {})),
        ...((typeof d[7] === "number" ? { fiftyTwoWeekHigh: d[7] } : {})),
        ...((typeof d[8] === "number" ? { fiftyTwoWeekLow: d[8] } : {})),
        ...((typeof d[9] === "number" ? { earningsTimestamp: d[9] } : {})),
        shortName: typeof d[11] === "string" ? d[11] : undefined,
        fullExchangeName: typeof d[12] === "string" ? d[12] : undefined,
      };
      tvCache.set(yahooSymbol, { at: now, q });
      out.set(yahooSymbol, q);
    }
  } catch {
    // stats unavailable; cards still show chart-based prices
  }
  return out;
}

/** Get stats per symbol: try Yahoo v7, fall back to TradingView. */
async function fetchBulkRichQuotes(
  symbols: string[],
  hints?: Map<string, string | undefined>,
): Promise<Map<string, RichQuote>> {
  const out = new Map<string, RichQuote>();
  const hintMap = hints ?? new Map();
  let viaTv = false;
  const yahoo = await fetchYahooV7(symbols);
  if (yahoo.length) {
    const found = new Map<string, RichQuote>();
    for (const q of yahoo) if (typeof q.symbol === "string") found.set(q.symbol, q);
    for (const s of symbols) if (found.has(s)) out.set(s, found.get(s)!);
  }
  const missing = symbols.filter((s) => !out.has(s));
  if (missing.length) {
    viaTv = true;
    const tv = await fetchTvRich(symbols, hintMap);
    for (const [s, q] of tv) out.set(s, q);
  }
  if (debugInfo) debugInfo = { ...(debugInfo ?? {}), viaTv };
  return out;
}

// ---------------------------------------------------------------- charts
const chartCache = new Map<string, { at: number; data: ChartData }>();
type ChartData = { points: { t: number; p: number }[]; prevClose: number | null };

const INTERVALS: Record<string, string> = {
  "1d": "5m", "5d": "15m", "1mo": "1h", "3mo": "1h", "6mo": "1d",
  ytd: "1d", "1y": "1d", "2y": "1d", "5y": "1wk", "10y": "1wk", max: "1mo",
};

async function fetchChart(symbol: string, range: string): Promise<ChartData | null> {
  const key = `${symbol}|${range}`;
  const hit = chartCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const interval = INTERVALS[range] ?? "1d";
  for (const host of HOSTS) {
    try {
      const res = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${interval}&includePrePost=false`,
        { headers: { "user-agent": UA, accept: "application/json" } },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as any;
      const r = json?.chart?.result?.[0];
      if (!r) continue;
      const ts: number[] = r.timestamp ?? [];
      const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
      const points = ts
        .map((t, i) => ({ t: t * 1000, p: closes[i] as number | null }))
        .filter((x): x is { t: number; p: number } => typeof x.p === "number" && x.p > 0);
      if (!points.length) return { points: [], prevClose: null };
      const prevClose =
        typeof r.meta?.chartPreviousClose === "number"
          ? r.meta.chartPreviousClose
          : typeof r.meta?.previousClose === "number"
            ? r.meta.previousClose
            : points[0].p;
      const data: ChartData = { points, prevClose };
      chartCache.set(key, { at: Date.now(), data });
      return data;
    } catch {
      // try next host
    }
  }
  return hit?.data ?? null;
}

type ChartMeta = {
  price: number;
  prevClose: number;
  currency?: string;
  exchange?: string;
  change?: number;
  changePct?: number;
} | null;

/** Latest price + day info from the 1d chart meta (crumb-free path). */
async function chartMeta(symbol: string, force: boolean): Promise<ChartMeta> {
  const key = `meta|${symbol}`;
  const hit = snapCache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.data as ChartMeta;
  for (const host of HOSTS) {
    try {
      const res = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d&includePrePost=false`,
        { headers: { "user-agent": UA, accept: "application/json" } },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as any;
      const r = json?.chart?.result?.[0];
      const m = r?.meta;
      if (!m || typeof m.regularMarketPrice !== "number") continue;
      const prevClose =
        typeof m.chartPreviousClose === "number" ? m.chartPreviousClose : m.previousClose;
      const change =
        typeof prevClose === "number" ? m.regularMarketPrice - prevClose : undefined;
      const data = {
        price: m.regularMarketPrice,
        prevClose: typeof prevClose === "number" ? prevClose : undefined,
        currency: m.currency,
        exchange: m.fullExchangeName ?? m.exchangeName,
        marketState: m.marketState,
        time: m.regularMarketTime,
        change,
        changePct: change != null && prevClose ? (change / prevClose) * 100 : undefined,
        name: m.longName ?? m.shortName,
      };
      snapCache.set(key, { at: Date.now(), data });
      return data;
    } catch {
      // try next host
    }
  }
  return hit?.data as ChartMeta ?? null;
}

// ---------------------------------------------------------------- old snapshot mode
const snapCache = new Map<string, { at: number; data: unknown }>();

async function symbolSnapshot(symbol: string, rich: RichQuote | undefined, force: boolean) {
  const hit = snapCache.get(symbol);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.data;
  for (const host of HOSTS) {
    try {
      const res = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d&includePrePost=false`,
        { headers: { "user-agent": UA, accept: "application/json" } },
      );
      if (!res.ok) continue;
      const json = (await res.json()) as any;
      const r = json?.chart?.result?.[0];
      const m = r?.meta;
      if (!m) continue;
      const ts: number[] = r.timestamp ?? [];
      const closes: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
      const points = ts
        .map((t, i) => [t * 1000, closes[i]] as [number, number | null])
        .filter((row): row is [number, number] => typeof row[1] === "number" && row[1] > 0)
        .slice(-90);
      const price =
        typeof m.regularMarketPrice === "number" ? m.regularMarketPrice : points.at(-1)?.[1];
      if (typeof price !== "number") continue;
      const prevClose =
        typeof m.chartPreviousClose === "number"
          ? m.chartPreviousClose
          : typeof m.previousClose === "number"
            ? m.previousClose
            : points[0]?.[1];
      const change = typeof prevClose === "number" ? price - prevClose : undefined;
      const data = {
        s: symbol,
        price,
        change,
        changePct: change != null && prevClose ? (change / prevClose) * 100 : undefined,
        prevClose,
        currency: m.currency,
        exchange: m.fullExchangeName ?? m.exchangeName,
        high52: rich?.fiftyTwoWeekHigh,
        low52: rich?.fiftyTwoWeekLow,
        marketCap: rich?.marketCap,
        points,
      };
      snapCache.set(symbol, { at: Date.now(), data });
      return data;
    } catch {
      // try next host
    }
  }
  return hit?.data ?? null;
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (req.method !== "GET") {
    return cors(new Response(JSON.stringify({ error: "GET only" }), { status: 405 }));
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("refresh") === "1";

  try {
    // ---- rich bulk quotes ----
    const batch = url.searchParams.get("batch");
    if (batch) {
      const symbols = batch.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 120);
      // Pass 1: chart meta for every symbol (prices, hands-off crumb).
      const metas = await pool(symbols, 8, (s) => chartMeta(s, force));
      const hints = new Map<string, string | undefined>();
      symbols.forEach((s, i) => hints.set(s, metas[i]?.exchange));
      // Pass 2: stats (Yahoo v7 -> TradingView fallback).
      const stats = await fetchBulkRichQuotes(symbols, hints);
      const quotes = symbols.map((s, i) => {
        const m = metas[i];
        const stat = stats.get(s);
        if (!m) return null;
        return {
          symbol: s,
          name: stat?.longName ?? stat?.shortName ?? m.name ?? s,
          type: m.currency === "USD" && s.startsWith("^") ? "INDEX" : "EQUITY",
          exchange: m.exchange,
          price: m.price,
          change: m.change ?? stat?.regularMarketChange,
          changePct: m.changePct ?? stat?.regularMarketChangePercent,
          prevClose: m.prevClose,
          marketCap: stat?.marketCap,
          pe: stat?.trailingPE,
          eps: stat?.epsTrailingTwelveMonths,
          divYield: stat?.dividendYield,
          priceToBook: stat?.priceToBook,
          high52: stat?.fiftyTwoWeekHigh,
          low52: stat?.fiftyTwoWeekLow,
          volume: stat?.regularMarketVolume ?? m.volume,
          avgVolume: stat?.averageDailyVolume3Month,
          earningsDate: stat?.earningsTimestamp,
          marketState: m.marketState,
          currency: m.currency,
          time: m.time,
        };
      });
      const ok = quotes.filter(Boolean);
      return cors(
        new Response(JSON.stringify({ quotes: ok, updatedAt: Date.now(), debug: debugInfo }), {
          status: ok.length ? 200 : 502,
          headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
        }),
      );
    }

    // ---- chart ----
    const chart = url.searchParams.get("chart");
    if (chart) {
      const symbol = url.searchParams.get("symbol") ?? "";
      const range = url.searchParams.get("range") ?? "1d";
      if (!symbol) {
        return cors(new Response(JSON.stringify({ error: "symbol required" }), { status: 400 }));
      }
      const data = await fetchChart(symbol, range);
      if (!data) return cors(new Response(JSON.stringify({ error: "chart unavailable" }), { status: 502 }));
      return cors(
        new Response(JSON.stringify({ ...data, updatedAt: Date.now() }), {
          headers: { "content-type": "application/json", "cache-control": "public, max-age=45" },
        }),
      );
    }

    // ---- old snapshot mode ----
    const symbols = (url.searchParams.get("symbols") ?? DEFAULT_SYMBOLS.join(","))
      .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 60);
    const rich = await fetchBulkRichQuotes(symbols);
    const quotesRaw = await pool(symbols, 8, (s) => symbolSnapshot(s, rich.get(s), force));
    const quotes = quotesRaw.filter(Boolean);
    return cors(
      new Response(JSON.stringify({ quotes, updatedAt: Date.now() }), {
        status: quotes.length ? 200 : 502,
        headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
      }),
    );
  } catch (err) {
    return cors(
      new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }),
        { status: 500, headers: { "content-type": "application/json" } },
      ),
    );
  }
});
