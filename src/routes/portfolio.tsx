import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle, SimBadge } from "@/components/mq/bits";
import { ChangeChip } from "@/components/mq/market";
import { TICKERS, pctLabel, priceLabel, type Quote } from "@/lib/mq/market";
import { useMarket } from "@/lib/mq/useMarket";
import { DEFS, DISCLAIMER } from "@/lib/mq/data";
import { InfoTip } from "@/components/mq/bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "My Practice Portfolio vs S&P 500 — Prafund" },
      {
        name: "description",
        content:
          "Research fictional stocks, trade with $10,000 of pretend money and compare your portfolio to a simulated S&P 500.",
      },
      { property: "og:title", content: "Practice Portfolio — Prafund" },
      {
        property: "og:description",
        content: "Trade simulated stocks and see how you stack up against the S&P 500.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioPage,
});

const START_CASH = 10_000;
const KEY = "fundition.portfolio.v1";

type Holding = { shares: number; cost: number };
type Trade = { t: number; side: "buy" | "sell"; symbol: string; shares: number; price: number };
type Pf = {
  cash: number;
  holdings: Record<string, Holding>;
  trades: Trade[];
  spxUnits: number | null;
};
type Pt = { t: number; you: number; spx: number };

const fresh = (): Pf => ({ cash: START_CASH, holdings: {}, trades: [], spxUnits: null });

function PortfolioPage() {
  const { snap } = useMarket(1500);
  const [pf, setPf] = useState<Pf>(fresh);
  const [hist, setHist] = useState<Pt[]>([]);
  const [sym, setSym] = useState("AAPL");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPf({ ...JSON.parse(raw), spxUnits: null });
    } catch {
      // Ignore malformed local saves and start fresh.
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(pf));
  }, [pf]);

  const price = (s: string) => snap?.quotes.find((q) => q.symbol === s)?.price ?? 0;
  const holdingsValue = snap
    ? Object.entries(pf.holdings).reduce((a, [s, h]) => a + h.shares * price(s), 0)
    : 0;
  const total = pf.cash + holdingsValue;
  const spxPrice = price("^GSPC");

  // Benchmark: what $10,000 in the S&P 500 would be worth, starting this visit.
  useEffect(() => {
    if (!snap || !spxPrice) return;
    setPf((p) => (p.spxUnits ? p : { ...p, spxUnits: START_CASH / spxPrice }));
  }, [snap, spxPrice]);
  const spxValue = pf.spxUnits ? pf.spxUnits * spxPrice : START_CASH;

  useEffect(() => {
    if (!snap) return;
    setHist((h) =>
      [...h, { t: snap.updatedAt, you: Math.round(total), spx: Math.round(spxValue) }].slice(-120),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap?.updatedAt]);

  const stocks = useMemo(() => snap?.quotes.filter((q) => q.symbol !== "^GSPC") ?? [], [snap]);
  const sel: Quote | undefined = snap?.quotes.find((q) => q.symbol === sym);
  const meta = TICKERS.find((t) => t.symbol === sym);
  const held = pf.holdings[sym]?.shares ?? 0;

  const trade = (side: "buy" | "sell") => {
    if (!sel || qty <= 0) return;
    const p = sel.price;
    const cost = p * qty;
    setPf((prev) => {
      const h = prev.holdings[sym] ?? { shares: 0, cost: 0 };
      if (side === "buy") {
        if (cost > prev.cash) {
          toast.error("Not enough pretend cash for that trade.");
          return prev;
        }
        toast.success(`Bought ${qty} ${sym} at ${priceLabel(p)}`);
        return {
          ...prev,
          cash: prev.cash - cost,
          holdings: { ...prev.holdings, [sym]: { shares: h.shares + qty, cost: h.cost + cost } },
          trades: [
            { t: Date.now(), side, symbol: sym, shares: qty, price: p },
            ...prev.trades,
          ].slice(0, 50),
        };
      }
      if (qty > h.shares) {
        toast.error(`You only own ${h.shares} ${sym}.`);
        return prev;
      }
      const left = h.shares - qty;
      const holdings = { ...prev.holdings };
      if (left === 0) delete holdings[sym];
      else holdings[sym] = { shares: left, cost: h.cost * (left / h.shares) };
      toast.success(`Sold ${qty} ${sym} at ${priceLabel(p)}`);
      return {
        ...prev,
        cash: prev.cash + cost,
        holdings,
        trades: [{ t: Date.now(), side, symbol: sym, shares: qty, price: p }, ...prev.trades].slice(
          0,
          50,
        ),
      };
    });
  };

  const youPct = ((total - START_CASH) / START_CASH) * 100;
  const spxPct = ((spxValue - START_CASH) / START_CASH) * 100;
  const diff = youPct - spxPct;
  const chart = hist.map((h) => ({
    ...h,
    time: new Date(h.t).toLocaleTimeString("en-US", { minute: "2-digit", second: "2-digit" }),
  }));

  // Live allocation pie: every holding's current value plus your cash.
  const PIE_COLORS = [
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#ec4899",
    "#84cc16",
    "#f97316",
    "#14b8a6",
    "#6366f1",
    "#a3a3a3",
  ];
  const pieData = useMemo(() => {
    const rows = Object.entries(pf.holdings)
      .map(([s, h]) => ({ name: s, value: Math.round(h.shares * price(s)) }))
      .filter((r) => r.value > 0);
    return [...rows, { name: "Cash", value: Math.round(pf.cash) }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pf, snap?.updatedAt]);
  const invested = pieData.length > 1;

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            eyebrow="Practice portfolio"
            title="Build a portfolio. Beat the S&P 500?"
            sub="You start with $10,000 of pretend money. Research, buy and sell simulated stocks, and compare against simply holding the S&P 500."
          />
          <SimBadge>Pretend money · simulated prices</SimBadge>
        </div>

        {!snap ? (
          <p className="mt-12 text-center text-muted-foreground">Opening the simulated market…</p>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Stat label="Your portfolio" value={priceLabel(total)} pct={youPct} />
              <Stat label="$10,000 in S&P 500" value={priceLabel(spxValue)} pct={spxPct} />
              <div className="mq-card p-5">
                <p className="text-sm text-muted-foreground">
                  <InfoTip label="You vs S&P 500" text={DEFS["Benchmark"]!} />
                </p>
                <p className="mq-num mt-1 text-3xl font-bold">
                  {diff >= 0 ? "↑" : "↓"} {pctLabel(diff)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {diff >= 0 ? "Ahead of" : "Behind"} the index so far. Results change every tick.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="mq-card p-5">
                <p className="font-semibold">Your portfolio vs S&P 500 (this session)</p>
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ left: -4, right: 8, top: 8 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        minTickGap={40}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <ReTooltip formatter={(v: number) => priceLabel(v)} />
                      <Legend />
                      <Line
                        dataKey="you"
                        name="Your portfolio"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        dataKey="spx"
                        name="S&P 500"
                        stroke="var(--info)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mq-card p-5">
                <p className="font-semibold">Your allocation</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  How your {priceLabel(total)} is split right now.
                </p>
                {invested ? (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="48%"
                          outerRadius="78%"
                          paddingAngle={2}
                          stroke="var(--card)"
                          strokeWidth={2}
                          isAnimationActive={false}
                          label={({ name, percent }) =>
                            `${name} ${Math.round((percent ?? 0) * 100)}%`
                          }
                          labelLine={false}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip formatter={(v: number) => priceLabel(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <p className="font-semibold">100% cash</p>
                    <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">
                      Buy a few shares and this pie chart will fill in with each stock you own.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              {/* Research + trade */}
              <div className="mq-card p-5">
                <label className="text-sm font-medium" htmlFor="sym">
                  Research a stock
                </label>
                <select
                  id="sym"
                  value={sym}
                  onChange={(e) => setSym(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-3 font-semibold"
                >
                  {stocks.map((q) => (
                    <option key={q.symbol} value={q.symbol}>
                      {q.symbol} · {q.name}
                    </option>
                  ))}
                </select>

                {sel && (
                  <>
                    <div className="mt-4 flex items-baseline justify-between">
                      <p className="mq-num text-3xl font-bold">{priceLabel(sel.price)}</p>
                      <ChangeChip pct={sel.changePct} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Info k="Sector" v={meta?.sector ?? sel.kind} />
                      <Info
                        k="Prev close"
                        v={sel.prevClose != null ? priceLabel(sel.prevClose) : "—"}
                      />
                      <Info
                        k="52-week range"
                        v={
                          sel.low52 != null && sel.high52 != null
                            ? `${priceLabel(sel.low52)} – ${priceLabel(sel.high52)}`
                            : "—"
                        }
                      />
                      <Info k="Exchange" v={sel.exchange ?? "—"} />
                      <Info k="You own" v={`${held} shares`} />
                    </dl>

                    <label className="mt-5 block text-sm font-medium" htmlFor="qty">
                      Shares
                    </label>
                    <input
                      id="qty"
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                      className="mq-num mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-lg font-bold"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Cost: {priceLabel(sel.price * qty)} · Cash available: {priceLabel(pf.cash)}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => trade("buy")}
                        className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => trade("sell")}
                        disabled={held === 0}
                        className="rounded-xl border border-border px-4 py-3 font-semibold disabled:opacity-50"
                      >
                        Sell
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Holdings */}
              <div className="mq-card p-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Your holdings</p>
                  <button
                    onClick={() => {
                      setPf({ ...fresh(), spxUnits: spxPrice ? START_CASH / spxPrice : null });
                      setHist([]);
                    }}
                    className="text-xs font-medium text-muted-foreground underline"
                  >
                    Reset to $10,000
                  </button>
                </div>
                {Object.keys(pf.holdings).length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="font-semibold">Your portfolio is empty.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pick a stock on the left and buy a few shares to start.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="py-2">Stock</th>
                          <th>Shares</th>
                          <th>Value</th>
                          <th>Gain/loss</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(pf.holdings).map(([s, h]) => {
                          const v = h.shares * price(s);
                          const g = v - h.cost;
                          return (
                            <tr
                              key={s}
                              className="cursor-pointer border-t border-border hover:bg-secondary"
                              onClick={() => setSym(s)}
                            >
                              <td className="py-2 font-semibold">{s}</td>
                              <td className="mq-num">{h.shares}</td>
                              <td className="mq-num">{priceLabel(v)}</td>
                              <td
                                className={cn(
                                  "mq-num font-semibold",
                                  g >= 0 ? "text-gain" : "text-alert",
                                )}
                              >
                                {g >= 0 ? "↑" : "↓"} {priceLabel(Math.abs(g))}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-border">
                          <td className="py-2 font-semibold">Cash</td>
                          <td />
                          <td className="mq-num">{priceLabel(pf.cash)}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="mt-6 font-semibold">Recent trades</p>
                {pf.trades.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No trades yet.</p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                    {pf.trades.map((t, i) => (
                      <li key={i} className="flex justify-between border-b border-border py-1">
                        <span>
                          {t.side === "buy" ? "Bought" : "Sold"} {t.shares} {t.symbol}
                        </span>
                        <span className="mq-num text-muted-foreground">{priceLabel(t.price)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mq-card mt-8 p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">What to notice</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Picking a few stocks can beat the index — or trail it. Holding one fund spreads
                  risk across many companies.
                </li>
                <li>
                  High-volatility stocks swing more in both directions. Try one, then compare.
                </li>
                <li>
                  The S&P 500 comparison restarts when you reopen the page, because simulated prices
                  restart too.
                </li>
              </ul>
              <Link
                to="/markets"
                className="mt-3 inline-block font-semibold text-foreground underline"
              >
                See live market charts →
              </Link>
            </div>
          </>
        )}

        <p className="mt-10 text-xs text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </Shell>
  );
}

function Stat({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="mq-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mq-num mt-1 text-3xl font-bold">{value}</p>
      <div className="mt-2">
        <ChangeChip pct={Math.round(pct * 100) / 100} />
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-b border-border pb-2">
      <dt className="text-xs text-muted-foreground">
        {DEFS[k] ? <InfoTip label={k} text={DEFS[k]!} /> : k}
      </dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
