// Supabase Edge Function: market-quotes
//
// GET /functions/v1/market-quotes?symbols=AAPL,MSFT
//
// Proxies Yahoo Finance's chart endpoint server-side (Yahoo does not send CORS
// headers, so browsers cannot call it directly) and returns a compact quote
// payload for the Prafund market feed. Per-symbol responses are cached
// in-memory for 45s so many clients polling stay cheap.
//
// Deploy: supabase functions deploy market-quotes --project-ref <ref>
// (In Lovable: ask Lovable to deploy the `market-quotes` edge function.)
// Then set VITE_MARKET_QUOTES_URL=https://<ref>.supabase.co/functions/v1/market-quotes
const DEFAULT_SYMBOLS = [
  "^GSPC",
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "META",
  "AMZN",
  "TSLA",
  "JPM",
  "V",
  "WMT",
  "AMD",
  "JNJ",
  "UNH",
  "NFLX",
  "DIS",
  "KO",
  "T",
  "DAL",
  "MAR",
  "CAT",
  "NEE",
  "FCX",
  "FSLR",
  "UPS",
  "PLTR",
  "PLD",
  "VOO",
  "VT",
  "VWO",
  "VNQ",
  "GLD",
  "BIL",
  "BND",
  "BTC-USD",
];

const TTL_MS = 45_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const HOSTS = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

const cache = new Map<string, { at: number; data: unknown }>();

function cors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "authorization, x-client-info, apikey, content-type");
  return new Response(res.body, { status: res.status, headers });
}

/** Fetch one symbol's intraday quote + 5m history, with a per-symbol cache. */
async function quote(symbol: string, force: boolean) {
  const hit = cache.get(symbol);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.data;

  for (const host of HOSTS) {
    try {
      const url =
        `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}` +
        `?interval=5m&range=1d&includePrePost=false`;
      const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
      if (!res.ok) continue;
      const json = await res.json();
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
        high52: m.fiftyTwoWeekHigh,
        low52: m.fiftyTwoWeekLow,
        points,
      };
      cache.set(symbol, { at: Date.now(), data });
      return data;
    } catch {
      // try the next host
    }
  }
  // Serve a stale entry rather than nothing, if we have one.
  return hit?.data ?? null;
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  }
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
  const symbols = (url.searchParams.get("symbols") ?? DEFAULT_SYMBOLS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);
  const force = url.searchParams.get("refresh") === "1";

  const results = await pool(symbols, 8, (s) => quote(s, force));
  const quotes = results.filter(Boolean);

  return cors(
    new Response(JSON.stringify({ quotes, updatedAt: Date.now() }), {
      status: quotes.length ? 200 : 502,
      headers: { "content-type": "application/json", "cache-control": "public, max-age=30" },
    }),
  );
});
