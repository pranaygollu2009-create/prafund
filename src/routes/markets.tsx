import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Pause, Play } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shell } from "@/components/mq/Shell";
import { InfoTip, SectionTitle, SimBadge } from "@/components/mq/bits";
import { ChangeChip, QuoteCard, TickerTape } from "@/components/mq/market";
import { TICKERS, marketIndex, pctLabel, priceLabel, type Quote } from "@/lib/mq/market";
import { useMarket } from "@/lib/mq/useMarket";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Live market prices — Prafund" },
      {
        name: "description",
        content:
          "Watch real stock, fund and crypto prices move with live charts, and learn how volatility feels before risking real money.",
      },
      { property: "og:title", content: "Live market prices — Prafund" },
      {
        property: "og:description",
        content:
          "Real market prices with live charts. Educational simulation for learning, never financial advice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Markets,
});

function Markets() {
  const { snap, live, setLive, source } = useMarket(1500);
  const [symbol, setSymbol] = useState("^GSPC");

  if (!snap) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center text-muted-foreground">
          Opening the market…
        </div>
      </Shell>
    );
  }

  const selected = snap.quotes.find((q) => q.symbol === symbol) ?? snap.quotes[0]!;
  const idx = marketIndex(snap);
  const up = selected.changePct >= 0;
  const chartData = selected.points.map((p) => ({
    time: new Date(p.t).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    p: p.p,
  }));

  return (
    <Shell>
      <TickerTape quotes={snap.quotes} />
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            eyebrow={source === "live" ? "Live market" : "Simulated fallback"}
            title="Markets that move while you watch"
            sub={
              source === "live"
                ? "Real prices for real companies, refreshed every 30 seconds from Yahoo Finance. For education only — not investment advice."
                : "The live feed is unavailable right now, so real tickers are priced by a simulation. For education only — not investment advice."
            }
          />
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                idx >= 0 ? "bg-gain-soft text-gain" : "bg-alert-soft text-alert",
              )}
            >
              <Activity className="size-3.5" aria-hidden /> Prafund Composite {idx >= 0 ? "↑" : "↓"}{" "}
              {pctLabel(idx)}
            </span>
            <button
              type="button"
              onClick={() => setLive(!live)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium"
            >
              {live ? (
                <Pause className="size-4" aria-hidden />
              ) : (
                <Play className="size-4" aria-hidden />
              )}
              {live ? "Pause feed" : "Resume feed"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="mq-card mq-glow self-start p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mq-num text-sm font-bold tracking-widest text-info">
                  {selected.symbol}
                </p>
                <h2 className="font-display text-2xl font-bold">{selected.name}</h2>
              </div>
              <SimBadge>{source === "live" ? "Live · Yahoo Finance" : "Simulated price"}</SimBadge>
            </div>
            <div className="mt-4 flex items-end gap-3">
              <p className="mq-num text-4xl font-bold">{priceLabel(selected.price)}</p>
              <ChangeChip pct={selected.changePct} />
              <span className={cn("mq-num text-sm font-semibold", up ? "text-gain" : "text-alert")}>
                {up ? "↑" : "↓"} {priceLabel(Math.abs(selected.change))} this session
              </span>
            </div>
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -12, right: 6, top: 8 }}>
                  <defs>
                    <linearGradient id="detail" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={up ? "var(--gain)" : "var(--alert)"}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={up ? "var(--gain)" : "var(--alert)"}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={["dataMin", "dataMax"]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: number) => priceLabel(v)}
                    width={78}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(v: number) => priceLabel(v)}
                  />
                  <Area
                    type="monotone"
                    dataKey="p"
                    stroke={up ? "var(--gain)" : "var(--alert)"}
                    strokeWidth={2}
                    fill="url(#detail)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <KeyStats quote={selected} />
            <p className="mt-3 text-xs text-muted-foreground">
              {source === "live"
                ? "Updated every 30 seconds while the feed runs. Prices come from Yahoo Finance (delayed up to ~15 minutes) via our market-data function."
                : "Simulated ticks every 1.5 seconds while the feed runs. Prices are seeded near each ticker's recent level with an assumed drift and volatility — not live market data."}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Watchlist</h2>
              <span className="text-xs text-muted-foreground">Tap a ticker to chart it</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-h-[900px] lg:grid-cols-1 lg:overflow-y-auto lg:pr-1">
              {snap.quotes.map((q) => (
                <QuoteCard
                  key={q.symbol}
                  quote={q}
                  selected={q.symbol === selected.symbol}
                  onSelect={() => setSymbol(q.symbol)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mq-card mt-10 p-6">
          <h2 className="font-display text-xl font-bold">Where do prices come from?</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {source === "live" ? (
              <>
                <li>Real quotes for real companies, sourced from Yahoo Finance.</li>
                <li>
                  Fetched through a small Supabase Edge Function — Yahoo blocks direct browser
                  calls.
                </li>
                <li>Refreshed every 30 seconds; Yahoo data may be delayed up to ~15 minutes.</li>
                <li>Session charts use the trading day's 5-minute price history.</li>
              </>
            ) : (
              <>
                <li>The live feed is unavailable right now, so prices are simulated.</li>
                <li>Model: geometric Brownian motion, one tick every 1.5 seconds.</li>
                <li>Inputs: an assumed annual drift and volatility per ticker.</li>
                <li>No fees, taxes, dividends or spreads are modelled.</li>
              </>
            )}
            <li>For education only — not a quote, recommendation, or offer to trade.</li>
            <li>Trading here uses pretend cash and never touches a real brokerage.</li>
          </ul>
          <Link
            to="/invest"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
          >
            Try the Return Simulator <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Shell>
  );
}

function KeyStats({ quote }: { quote: Quote }) {
  const t = TICKERS.find((x) => x.symbol === quote.symbol);
  const hi = Math.max(...quote.points.map((p) => p.p));
  const lo = Math.min(...quote.points.map((p) => p.p));
  const stats: [string, string, string][] = [
    ["Open", priceLabel(quote.open), "Price when this session began"],
    [
      "Prev close",
      quote.prevClose != null ? priceLabel(quote.prevClose) : "—",
      "The previous session's closing price",
    ],
    ["Session high", priceLabel(hi), "Highest price shown on the chart"],
    ["Session low", priceLabel(lo), "Lowest price shown on the chart"],
    [
      "52-week range",
      quote.low52 != null && quote.high52 != null
        ? `${priceLabel(quote.low52)} – ${priceLabel(quote.high52)}`
        : "—",
      "Lowest and highest price over the past year",
    ],
    ["Exchange", quote.exchange ?? "—", "Market where this security trades"],
    ["Currency", quote.currency ?? "—", "Currency the price is quoted in"],
    ["Sector", t?.sector ?? "—", "Part of the economy it belongs to"],
  ];
  return (
    <div className="mt-5">
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Key stats
      </h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {stats.map(([k, v, tip]) => (
          <div key={k} title={tip} className="border-b border-border pb-2">
            <dt className="text-xs text-muted-foreground">
              <InfoTip label={k} text={tip} />
            </dt>
            <dd className="mq-num text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">
        Prices are for education only — not investment advice. In live mode, quotes may be delayed
        up to ~15 minutes.
      </p>
    </div>
  );
}
