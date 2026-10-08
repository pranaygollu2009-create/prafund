import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from "recharts";
import { Shell } from "@/components/mq/Shell";
import { InfoTip, SectionTitle, SimBadge, StatCard } from "@/components/mq/bits";
import { DISCLAIMER } from "@/lib/mq/data";
import { ASSET_STATS, blended, chanceAbove, money, monteCarlo, type SimResult } from "@/lib/mq/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/invest")({
  head: () => ({
    meta: [
      { title: "Return Simulator & Investment Lab — Prafund" },
      {
        name: "description",
        content:
          "Run 10,000 hypothetical scenarios on a mix of stocks, bonds and cash, compare portfolios and see the full range of simulated outcomes.",
      },
      { property: "og:title", content: "Prafund Return Simulator" },
      {
        property: "og:description",
        content: "Change the inputs, run the simulation, and see how much outcomes can vary.",
      },
    ],
  }),
  component: Invest,
});

const PRESETS = [
  { id: "growth", label: "Portfolio C · 100% stocks", alloc: { stocks: 100, bonds: 0, cash: 0 } },
  { id: "balanced", label: "Portfolio A · 80/20", alloc: { stocks: 80, bonds: 20, cash: 0 } },
  { id: "moderate", label: "Portfolio B · 50/50", alloc: { stocks: 50, bonds: 50, cash: 0 } },
  { id: "cautious", label: "60 / 20 / 20", alloc: { stocks: 60, bonds: 20, cash: 20 } },
];

function Invest() {
  const [initial, setInitial] = useState(1000);
  const [monthly, setMonthly] = useState(200);
  const [years, setYears] = useState(10);
  const [stocks, setStocks] = useState(60);
  const [bonds, setBonds] = useState(20);
  const [target, setTarget] = useState(30000);
  const [result, setResult] = useState<SimResult | null>(null);
  const [busy, setBusy] = useState(false);

  const cash = Math.max(0, 100 - stocks - bonds);
  const allocation = { stocks, bonds, cash };
  const stats = blended(allocation);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      setResult(monteCarlo({ initial, monthly, years, allocation }));
      setBusy(false);
    }, 60);
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <SectionTitle
          eyebrow="📈 Investment Lab"
          title="Return Simulator"
          sub="Set your inputs, then run thousands of hypothetical scenarios instead of trusting one single number."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="mq-card p-6">
            <NumberField label="Initial investment" value={initial} step={100} onChange={setInitial} />
            <NumberField label="Monthly contribution" value={monthly} step={25} onChange={setMonthly} />

            <p className="mt-6 text-sm font-medium">Time period</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 5, 10, 20, 30].map((y) => (
                <button
                  key={y}
                  onClick={() => setYears(y)}
                  aria-pressed={years === y}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-semibold",
                    years === y ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {y} yr
                </button>
              ))}
            </div>

            <p className="mt-6 text-sm font-medium">Allocation</p>
            <RangeRow label="Stocks" value={stocks} onChange={(v) => setStocks(Math.min(100 - bonds, v))} />
            <RangeRow label="Bonds" value={bonds} onChange={(v) => setBonds(Math.min(100 - stocks, v))} />
            <p className="mt-2 text-sm text-muted-foreground">
              Cash: <span className="mq-num font-bold text-foreground">{cash}%</span>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setStocks(p.alloc.stocks);
                    setBonds(p.alloc.bonds);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <NumberField label="Your target value" value={target} step={1000} onChange={setTarget} />

            <button
              onClick={run}
              disabled={busy}
              className="mt-6 w-full rounded-xl bg-primary px-6 py-4 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Running 10,000 hypothetical scenarios…" : "Run Simulation"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Assumed blended return {(stats.mean * 100).toFixed(1)}%/yr with{" "}
              <InfoTip
                label="volatility"
                text="Volatility describes how much an investment's value has historically moved up and down."
              />{" "}
              of {(stats.vol * 100).toFixed(1)}%.
            </p>
          </div>

          <div className="space-y-4">
            {!result && !busy && (
              <div className="mq-card grid min-h-[280px] place-items-center p-8 text-center">
                <div>
                  <p className="font-display text-xl font-bold">Your portfolio is empty.</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Start your first simulated investment to explore how different strategies could behave.
                  </p>
                  <button onClick={run} className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
                    Explore Investments →
                  </button>
                </div>
              </div>
            )}

            {busy && (
              <div className="mq-card p-8">
                <p className="font-semibold">Running 10,000 hypothetical scenarios…</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-2 w-1/2 animate-pulse rounded-full bg-info" />
                </div>
              </div>
            )}

            {result && !busy && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard title="Lower outcome (10th %ile)" value={money(result.p10)} tone="alert" />
                  <StatCard title="Median outcome" value={money(result.median)} />
                  <StatCard title="Higher outcome (90th %ile)" value={money(result.p90)} tone="gain" />
                </div>

                <div className="mq-card border-info bg-info-soft p-5">
                  <p className="font-display text-lg font-bold">
                    {chanceAbove(result.values, target)}% of simulated scenarios finished above your target of{" "}
                    {money(target)}.
                  </p>
                  <p className="mt-2 text-sm">
                    This percentage is generated by the simulation using its selected assumptions and statistical inputs.
                    It is not a prediction or guarantee of future investment performance.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Total contributed over {result.runs.toLocaleString()} scenarios:{" "}
                    <span className="mq-num font-semibold text-foreground">{money(result.contributions)}</span>
                  </p>
                </div>

                <div className="mq-card p-5">
                  <p className="font-semibold">Range of simulated paths</p>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.path} margin={{ left: -8, right: 8, top: 8 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                        <YAxis
                          tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                        />
                        <ReTooltip formatter={(v: number) => money(v)} labelFormatter={(l) => `Year ${l}`} />
                        <Line dataKey="high" stroke="var(--gain)" dot={false} strokeWidth={2} name="Higher (90th)" />
                        <Line dataKey="median" stroke="var(--primary)" dot={false} strokeWidth={2} name="Median" />
                        <Line dataKey="low" stroke="var(--alert)" dot={false} strokeWidth={2} name="Lower (10th)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mq-card p-5">
                  <p className="font-semibold">
                    <InfoTip
                      label="Distribution of ending values"
                      text="A Monte Carlo simulation creates many hypothetical outcomes using selected assumptions and randomness."
                    />
                  </p>
                  <div className="mt-3 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.buckets} margin={{ left: -18, right: 8, top: 8 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={3} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                        <ReTooltip formatter={(v: number) => `${v} scenarios`} />
                        <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <details className="mq-card p-5">
                  <summary className="cursor-pointer font-semibold">How was this calculated?</summary>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>Scenarios: {result.runs.toLocaleString()} independent random paths.</li>
                    <li>
                      Return assumptions (long-run averages used for teaching): stocks{" "}
                      {(ASSET_STATS.stocks.mean * 100).toFixed(0)}%/yr, bonds {(ASSET_STATS.bonds.mean * 100).toFixed(0)}
                      %/yr, cash {(ASSET_STATS.cash.mean * 100).toFixed(0)}%/yr.
                    </li>
                    <li>
                      Volatility assumptions: stocks {(ASSET_STATS.stocks.vol * 100).toFixed(0)}%, bonds{" "}
                      {(ASSET_STATS.bonds.vol * 100).toFixed(0)}%, cash {(ASSET_STATS.cash.vol * 100).toFixed(0)}%.
                    </li>
                    <li>
                      Methodology: monthly steps, normally distributed random returns (Box–Muller), your allocation
                      blended assuming low correlation between sleeves.
                    </li>
                    <li>Contribution schedule: {money(monthly)} added at the end of every simulated month.</li>
                    <li>Fees and inflation are not modelled in this version, so figures are before both.</li>
                    <li>
                      These are hypothetical simulation inputs, not historical performance of any specific fund. Changing
                      the assumptions changes the results.
                    </li>
                  </ul>
                </details>
              </>
            )}
          </div>
        </div>

        <section className="mt-16">
          <SectionTitle
            eyebrow="Portfolio comparison"
            title="Same money, different mixes"
            sub="Run each preset above and compare. None of these is 'best' — they trade a smoother ride for a different range of outcomes."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PRESETS.slice(0, 3).map((p) => {
              const s = blended(p.alloc);
              return (
                <div key={p.id} className="mq-card p-5">
                  <p className="font-semibold">{p.label}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Assumed return <span className="mq-num font-bold text-foreground">{(s.mean * 100).toFixed(1)}%</span>
                    /yr
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Volatility <span className="mq-num font-bold text-foreground">{(s.vol * 100).toFixed(1)}%</span>
                  </p>
                  <button
                    onClick={() => {
                      setStocks(p.alloc.stocks);
                      setBonds(p.alloc.bonds);
                      run();
                    }}
                    className="mt-4 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
                  >
                    Simulate this mix
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <SectionTitle eyebrow="Beginner tool" title="Simple investment calculator" />
          <SimpleCalc />
        </section>

        <p className="mt-12 text-xs leading-relaxed text-muted-foreground">
          <SimBadge>Hypothetical simulation</SimBadge> {DISCLAIMER}
        </p>
      </div>
    </Shell>
  );
}

function SimpleCalc() {
  const [start, setStart] = useState(500);
  const [monthly, setMonthly] = useState(150);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(6);

  const months = years * 12;
  const r = rate / 100 / 12;
  const fv = start * (1 + r) ** months + (r === 0 ? monthly * months : monthly * (((1 + r) ** months - 1) / r));
  const contributed = start + monthly * months;

  return (
    <div className="mq-card mt-6 grid gap-6 p-6 md:grid-cols-2">
      <div>
        <NumberField label="Starting amount" value={start} step={100} onChange={setStart} />
        <NumberField label="Monthly contribution" value={monthly} step={25} onChange={setMonthly} />
        <NumberField label="Years" value={years} step={1} onChange={setYears} />
        <NumberField label="Assumed annual return (%)" value={rate} step={1} onChange={setRate} />
      </div>
      <div className="space-y-3">
        <StatCard title="Total contributions" value={money(contributed)} />
        <StatCard title="Hypothetical growth" value={money(fv - contributed)} tone="gain" />
        <StatCard title="Hypothetical final value" value={money(fv)} tone="info" />
        <p className="text-xs text-muted-foreground">
          This is an assumption-based calculation using a fixed return every month. Real returns vary year to year.
        </p>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="mq-num mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-lg font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
    </label>
  );
}

function RangeRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="mt-3 block">
      <span className="flex items-baseline justify-between text-sm">
        {label}
        <span className="mq-num font-bold">{value}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full accent-[var(--primary)]"
      />
    </label>
  );
}
