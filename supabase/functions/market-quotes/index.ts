// Supabase Edge Function: market-quotes
//
// GET /functions/v1/market-quotes?symbols=AAPL,MSFT
//   -> old (snapshot) mode: intraday 1d/5m chart points + quote per symbol.
// GET /functions/v1/market-quotes?batch=AAPL,MSFT,...
//   -> rich bulk quotes from Yahoo's v7 quote endpoint (one upstream call),
//      including market cap, P/E, EPS, 52-week range, volume, earnings date.
// GET /functions/v1/market-quotes?chart=1&symbol=AAPL&range=1mo
//   -> chart series ({points:[{t,p}], prevClose}) for the selected range.
//
// Proxies Yahoo Finance server-side (Yahoo does not send CORS headers, so
// browsers cannot call it directly). Responses are cached in-memory per
// symbol so many clients polling stay cheap.

const DEFAULT_SYMBOLS = [
  "^GSPC", "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "JPM",
  "V", "WMT", "XOM", "UNH", "JNJ", "^IXIC", "BTC-USD",
];

const TTL_MS = 45_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0 Safari/537.36";
const HOSTS = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

// ---------------------------------------------------------------- v7 crumb
type Crumb = { cookie: string; crumb: string; at: number };
let crumbSession: Crumb | null = null;
const CRUMB_TTL_MS = 3 * 60 * 60 * 1000; // 3h

let debugInfo: Record<string, unknown> | null = null;

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
    const cookieNames: string[] = [];
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
      const pairs = raw
        .map((c) => c.split(";")[0].trim())
        .filter(Boolean);
      if (pairs.length) {
        for (const px of pairs) cookieNames.push(px.split("=")[0] ?? "");
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
      if (typeof (rh as unknown as { body?: ReadableStream }).body?.cancel === "function") {
        (rh as unknown as { body: ReadableStream }).body.cancel();
      }
    }
    const crumbHosts = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];
    let r2: Response | null = null;
    let crumb = "";
    const crumbStatuses: number[] = [];
    for (const ch of crumbHosts) {
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
        r2 = rr;
        crumb = t;
        break;
      }
    }
    debugInfo = {
      hopStatuses,
      cookieNames,
      crumbStatuses,
      crumbLen: crumb.length,
      crumbOk: Boolean(crumb),
    };
    if (!crumb || crumb.length > 30 || crumb.startsWith("\"")) {
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

// ---------------------------------------------------------------- bulk v7
const quoteCache = new Map<string, { at: number; q: Record<string, unknown> | null }>();

type RichQuote = Record<string, unknown> & { symbol: string };

async function fetchBulkRichQuotes(
  symbols: string[],
): Promise<Map<string, RichQuote>> {
  const out = new Map<string, RichQuote>();
  const now = Date.now();
  const need: string[] = [];
  for (const s of symbols) {
    const hit = quoteCache.get(s);
    if (hit && now - hit.at < TTL_MS && hit.q) out.set(s, hit.q as RichQuote);
    else need.push(s);
  }
  if (need.length) {
    const session = await getCrumbSession();
    if (session) {
      for (const host of HOSTS) {
        try {
          const url =
            `https://${host}/v7/finance/quote?symbols=` +
            encodeURIComponent(need.join(",")) +
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
          const json = (await res.json()) as {
            quoteResponse?: { result?: RichQuote[] };
          };
          for (const q of json?.quoteResponse?.result ?? []) {
            if (typeof q?.symbol !== "string") continue;
            quoteCache.set(q.symbol, { at: now, q });
            out.set(q.symbol, q);
          }
          if (out.size) break;
        } catch {
          // try next host
        }
      }
    }
  }
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

// ---------------------------------------------------------------- old snapshot mode
type SnapEntry = { at: number; data: unknown } | undefined;
const snapCache = new Map<string, SnapEntry>();

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
  if (url.searchParams.get("debug")) {
    const s = await getCrumbSession();
    const rich = await fetchBulkRichQuotes(["AAPL"]);
    return cors(new Response(JSON.stringify({ session: Boolean(s), debug: debugInfo, aaplCap: (rich.get("AAPL") as { marketCap?: unknown } | undefined)?.marketCap ?? null }), { headers: { "content-type": "application/json" } }));
  }

  try {
    // ---- rich bulk quotes ----
    const batch = url.searchParams.get("batch");
    if (batch) {
      const symbols = batch
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 120);
      const quotes = await fetchBulkRichQuotes(symbols);
      const ordered = symbols.map((s) => quotes.get(s)).filter(Boolean);
      return cors(
        new Response(JSON.stringify({ quotes: ordered, updatedAt: Date.now() }), {
          status: ordered.length ? 200 : 502,
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=30",
          },
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
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 60);
    const rich = await fetchBulkRichQuotes(symbols);
    const quotesRaw = await pool(symbols, 8, (s) => symbolSnapshot(s, rich.get(s), force));
    const quotes = quotesRaw.filter(Boolean);
    return cors(
      new Response(JSON.stringify({ quotes, updatedAt: Date.now() }), {
        status: quotes.length ? 200 : 502,
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=30",
        },
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
