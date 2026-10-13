import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle } from "@/components/mq/bits";
import { fetchLiveChart, fetchLiveQuotes, type LiveQuote } from "@/lib/mq/live.quotes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Live stock market — Prafund" },
      { name: "description", content: "Real stock prices, charts, market caps, P/E ratios and earnings dates for major US stocks, ETFs and indexes." },
      { property: "og:title", content: "Live stock market — Prafund" },
      { property: "og:description", content: "Real market quotes with charts and key stats, explained for beginners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Markets,
});

const INDEXES = ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX", "BTC-USD"];
const STOCKS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "JPM", "V", "WMT", "XOM", "JNJ", "UNH",
  "MA", "PG", "HD", "COST", "NFLX", "AMD", "DIS", "KO", "PEP", "BAC", "NKE", "INTC", "CRM", "ORCL", "SPY", "QQQ", "VOO",
  "LLY", "AVGO", "ADBE", "CVX", "MRK", "ABBV", "MCD", "GS", "IBM", "BA", "CSCO", "GE", "CAT", "ABT", "TXN", "PYPL",
  "SBUX", "VZ", "PFE", "RTX", "MMM", "AMGN", "T", "DHR", "LOW", "UPS", "F", "GM",
];
const RANGES = ["1d", "5d", "1mo", "6mo", "ytd", "1y", "5y", "max"] as const;
type Range = (typeof RANGES)[number];

const usd = (n?: number, cur = "USD") =>
  n === undefined ? "—" : n.toLocaleString("en-US", { style: "currency", currency: cur, maximumFractionDigits: 2 });
const big = (n?: number) => {
  if (n === undefined) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  return n.toLocaleString("en-US");
};
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const isIndex = (s: string) => s.startsWith("^");

function Markets() {
  const [extra, setExtra] = useState<string[]>([]);
  const [symbol, setSymbol] = useState("^GSPC");
  const [range, setRange] = useState<Range>("1d");
  const [q, setQ] = useState("");
  const all = [...INDEXES, ...STOCKS, ...extra];

  const quotes = useQuery({
    queryKey: ["live-quotes", all.join(",")],
    queryFn: () => fetchLiveQuotes(all),
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const chart = useQuery({
    queryKey: ["live-chart", symbol, range],
    queryFn: () => fetchLiveChart(symbol, range),
    refetchInterval: range === "1d" ? 30_000 : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const list = quotes.data ?? [];
  const sel = list.find((x) => x.symbol === symbol);
  const indexes = list.filter((x) => INDEXES.includes(x.symbol));
  const stocks = list.filter((x) => !INDEXES.includes(x.symbol));
  const pts = chart.data?.points ?? [];
  const up = pts.length > 1 ? pts[pts.length - 1]!.p >= (range === "1d" ? (chart.data?.prevClose ?? pts[0]!.p) : pts[0]!.p) : (sel?.change ?? 0) >= 0;
  const color = up ? "var(--gain)" : "var(--alert)";
  const fmtT = (t: number) =>
    new Date(t).toLocaleString("en-US", range === "1d" ? { hour: "numeric", minute: "2-digit" } : range === "5d" || range === "1mo" ? { month: "short", day: "numeric" } : { month: "short", year: "2-digit" });

  const addSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    const s = q.trim().toUpperCase();
    if (!s) return;
    if (!all.includes(s)) setExtra((x) => [...x, s]);
    setSymbol(s);
    setQ("");
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <SectionTitle
          eyebrow="Real market data"
          title="Live markets"
          sub="Real quotes for US stocks, ETFs and indexes, refreshed every 15 seconds. Quotes may be delayed. For learning only — not investment advice."
        />

        {quotes.isError && (
          <div className="mq-card mt-6 p-5 text-sm">
            Something went wrong. We couldn't load market data.{" "}
            <button className="font-semibold underline" onClick={() => quotes.refetch()}>Try again</button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {indexes.map((x) => (
            <button
              key={x.symbol}
              onClick={() => setSymbol(x.symbol)}
              className={cn("mq-card p-3 text-left", x.symbol === symbol && "ring-2 ring-ring")}
            >
              <p className="truncate text-xs text-muted-foreground">{x.name ?? x.symbol}</p>
              <p className="mq-num font-bold">{x.price?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? "—"}</p>
              <p className={cn("mq-num text-xs font-semibold", (x.change ?? 0) >= 0 ? "text-gain" : "text-alert")}>
                {(x.change ?? 0) >= 0 ? "↑" : "↓"} {pct(x.changePct ?? 0)}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="mq-card p-5">
            {sel ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="mq-num text-sm font-bold text-muted-foreground">{sel.symbol} · {sel.exchange}</p>
                    <h2 className="font-display text-2xl font-bold">{sel.name}</h2>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                    {sel.marketState === "REGULAR" ? "● Market open" : "Market closed"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <p className="mq-num text-4xl font-bold">{isIndex(sel.symbol) ? sel.price?.toLocaleString("en-US", { maximumFractionDigits: 2 }) : usd(sel.price, sel.currency)}</p>
                  <p className={cn("mq-num pb-1 font-semibold", (sel.change ?? 0) >= 0 ? "text-gain" : "text-alert")}>
                    {(sel.change ?? 0) >= 0 ? "↑" : "↓"} {(sel.change ?? 0).toFixed(2)} ({pct(sel.changePct ?? 0)}) today
                  </p>
                </div>
                {sel.time && <p className="text-xs text-muted-foreground">As of {new Date(sel.time * 1000).toLocaleString()}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">Loading quote…</p>
            )}

            <div className="mt-4 flex flex-wrap gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn("rounded-md px-3 py-1.5 text-xs font-semibold uppercase", r === range ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="mt-3 h-72">
              {chart.isLoading ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">Loading chart…</div>
              ) : pts.length < 2 ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">No chart data for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pts} margin={{ left: -8, right: 6, top: 8 }}>
                    <defs>
                      <linearGradient id="live" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="t" tickFormatter={fmtT} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={50} />
                    <YAxis domain={["dataMin", "dataMax"]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 })} width={64} />
                    <ReTooltip
                      labelFormatter={(t: number) => new Date(t).toLocaleString()}
                      formatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" }}
                    />
                    <Area type="monotone" dataKey="p" stroke={color} strokeWidth={2} fill="url(#live)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {sel && <Stats q={sel} />}
          </div>

          <div>
            <form onSubmit={addSymbol} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Add any ticker, e.g. PLTR"
                  aria-label="Ticker symbol"
                  className="w-full rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm"
                />
              </div>
              <button className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Add</button>
            </form>
            <div className="mq-card mt-3 divide-y divide-border lg:max-h-[820px] lg:overflow-y-auto">
              {stocks.length === 0 && <p className="p-4 text-sm text-muted-foreground">Loading watchlist…</p>}
              {stocks.map((x) => (
                <button
                  key={x.symbol}
                  onClick={() => setSymbol(x.symbol)}
                  className={cn("flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary", x.symbol === symbol && "bg-secondary")}
                >
                  <div className="min-w-0">
                    <p className="mq-num text-sm font-bold">{x.symbol}</p>
                    <p className="truncate text-xs text-muted-foreground">{x.name} · {big(x.marketCap)}</p>
                  </div>
                  <div className="text-right">
                    <p className="mq-num text-sm font-semibold">{usd(x.price, x.currency)}</p>
                    <p className={cn("mq-num text-xs font-semibold", (x.change ?? 0) >= 0 ? "text-gain" : "text-alert")}>
                      {(x.change ?? 0) >= 0 ? "↑" : "↓"} {pct(x.changePct ?? 0)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mq-card mt-10 p-6">
          <h2 className="font-display text-xl font-bold">About this data</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Prices, market caps and ratios come from public market data (Yahoo Finance) and may be delayed. Past
            performance doesn't guarantee future results. Want to practice trading without risk?
          </p>
          <Link to="/portfolio" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            Try the practice portfolio <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function Stats({ q }: { q: LiveQuote }) {
  const rows: [string, string, string][] = [
    ["Previous close", usd(q.prevClose, q.currency), "Price when the market last closed"],
    ["Open", usd(q.open, q.currency), "First trade price today"],
    ["Day range", q.dayLow ? `${q.dayLow.toFixed(2)} – ${q.dayHigh?.toFixed(2)}` : "—", "Lowest and highest price today"],
    ["52-week range", q.low52 ? `${q.low52.toFixed(2)} – ${q.high52?.toFixed(2)}` : "—", "Lowest and highest price over the past year"],
    ["Market cap", big(q.marketCap), "Total value of all the company's shares"],
    ["P/E (TTM)", q.pe ? q.pe.toFixed(2) : "—", "Price ÷ last 12 months' earnings per share"],
    ["Forward P/E", q.forwardPe ? q.forwardPe.toFixed(2) : "—", "Price ÷ expected next-year earnings"],
    ["EPS (TTM)", q.eps ? q.eps.toFixed(2) : "—", "Profit per share over the last 12 months"],
    ["Dividend yield", q.divYield ? `${q.divYield.toFixed(2)}%` : "—", "Yearly cash paid to owners as % of price"],
    ["Price / book", q.priceToBook ? q.priceToBook.toFixed(2) : "—", "Price compared with the company's net assets per share"],
    ["Volume", big(q.volume), "Shares traded today"],
    ["Avg volume (3M)", big(q.avgVolume), "Average shares traded per day"],
    ["Earnings date", q.earningsDate ? new Date(q.earningsDate * 1000).toLocaleDateString() : "—", "When the company reports results"],
  ];
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {rows.map(([k, v, tip]) => (
        <div key={k} title={tip} className="border-b border-border pb-2">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="mq-num text-sm font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
