import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
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
import { InfoTip, SectionTitle, SimBadge, StatCard } from "@/components/mq/bits";
import { CAREERS, EVENTS } from "@/lib/mq/data";
import { expenses, financialHealth, money, netWorth, type GameState } from "@/lib/mq/engine";
import { advanceMonth, useGame } from "@/lib/mq/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your simulator dashboard — Prafund" },
      {
        name: "description",
        content:
          "Track simulated cash, savings, investments, debt, net worth and financial health month by month in Prafund.",
      },
      { property: "og:title", content: "Your Prafund dashboard" },
      { property: "og:description", content: "Plan a paycheck, handle an unexpected event, finish the month." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, loaded, save } = useGame();

  if (!loaded) {
    return (
      <Shell>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted-foreground">Loading your journey…</div>
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">You haven&apos;t started a journey yet.</h1>
          <p className="mt-3 text-muted-foreground">
            Pick a career and a lifestyle, and your first simulated paycheck arrives right away.
          </p>
          <Link
            to="/start"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground"
          >
            Start Playing <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Shell>
    );
  }

  return <Live state={state} save={save} />;
}

function Live({ state, save }: { state: GameState; save: (s: GameState | null) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const e = expenses(state);
  const health = financialHealth(state);
  const career = CAREERS.find((c) => c.id === state.career);
  const ev = EVENTS[state.eventIndex % EVENTS.length]!;
  const leftover = state.takeHome - e.total;
  const plan = state.plan;

  const setPlan = (patch: Partial<GameState["plan"]>) => save({ ...state, plan: { ...plan, ...patch } });

  const finishMonth = () => {
    setRunning(true);
    setTimeout(() => {
      save(advanceMonth(state, choice));
      setChoice(null);
      setRunning(false);
    }, 350);
  };

  const chartData = state.history.map((h) => ({ month: `M${h.month}`, netWorth: h.netWorth }));

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">Welcome back!</h1>
            <p className="mt-2 text-muted-foreground">
              Month {state.month} of your financial journey · {career?.emoji} {career?.title} · {state.xp} XP
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("Reset your simulated journey and start over?")) save(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            <RotateCcw className="size-4" aria-hidden /> Reset journey
          </button>
        </div>

        {state.lastMonth && (
          <div className="mq-card mt-6 border-gain bg-gain-soft p-5">
            <p className="font-display text-lg font-bold">Month {state.month - 1} complete!</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {[
                ["Income", money(state.lastMonth.income)],
                ["Spent", money(state.lastMonth.spent)],
                ["Saved", money(state.lastMonth.saved)],
                ["Invested", money(state.lastMonth.invested)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs font-medium text-muted-foreground">{k}</p>
                  <p className="mq-num text-lg font-bold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold">
              Net worth change: {state.lastMonth.change >= 0 ? "+" : ""}
              {money(state.lastMonth.change)} {state.lastMonth.change >= 0 ? "↑" : "↓"} · +150 XP
            </p>
            <p className="mt-1 text-sm">{state.lastMonth.eventNote}</p>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Cash" value={money(state.cash)} hint="Money not yet assigned to savings or investing." />
          <StatCard title="Savings" value={money(state.savings)} tone="gain" hint="Earns 3%/yr in the simulation." />
          <StatCard
            title="Investments"
            value={money(state.investments)}
            tone="info"
            hint="Value moves up and down each simulated month."
          />
          <StatCard title="Debt" value={money(state.debt)} tone="alert" hint="Simulated credit at 19% APR." />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="mq-card p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                <InfoTip label="Net worth" text="Net worth is the value of what you own minus what you owe." />
              </p>
              <SimBadge>Simulated</SimBadge>
            </div>
            <p className="mq-num mt-1 text-4xl font-bold">{money(netWorth(state))}</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -18, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--gain)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <ReTooltip formatter={(v: number) => money(v)} />
                  <Area type="monotone" dataKey="netWorth" stroke="var(--gain)" strokeWidth={2} fill="url(#nw)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mq-card p-5">
            <p className="text-sm font-medium text-muted-foreground">
              <InfoTip
                label="Financial health"
                text="A transparent score built only from your simulated savings rate, emergency fund, debt, investing and lessons finished. It does not describe a real person's finances."
              />
            </p>
            <p className="mq-num mt-1 text-4xl font-bold">{health.total} / 100</p>
            <div className="mt-3 h-2 rounded-full bg-secondary">
              <div className="h-2 rounded-full bg-gain transition-all" style={{ width: `${health.total}%` }} />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {health.parts.map((p) => (
                <li key={p.label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="mq-num font-semibold">
                    {Math.max(0, p.score)} / {p.max}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="mq-card p-5">
            <h2 className="font-display text-xl font-bold">Monthly budget</h2>
            <Row label="Income" amount={state.takeHome} positive max={state.takeHome} />
            <Row label="Housing" amount={-e.housing} max={state.takeHome} />
            <Row label="Food" amount={-e.food} max={state.takeHome} />
            <Row label="Transportation" amount={-e.transport} max={state.takeHome} />
            <Row label="Entertainment" amount={-e.fun} max={state.takeHome} />
            <Row label="Savings" amount={Math.min(plan.save, Math.max(0, leftover))} positive max={state.takeHome} />
            <Row
              label="Investments"
              amount={Math.min(plan.invest, Math.max(0, leftover - plan.save))}
              positive
              max={state.takeHome}
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Left after fixed expenses: <span className="mq-num font-bold text-foreground">{money(leftover)}</span>
            </p>
          </div>

          <div className="mq-card p-5">
            <h2 className="font-display text-xl font-bold">This month&apos;s plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag to decide where your paycheck goes. Anything left over stays as cash.
            </p>
            <Slider
              label="Save"
              value={plan.save}
              max={Math.max(0, leftover)}
              onChange={(v) => setPlan({ save: v })}
            />
            <Slider
              label="Invest"
              value={plan.invest}
              max={Math.max(0, leftover - plan.save)}
              onChange={(v) => setPlan({ invest: v })}
            />
            <Slider
              label="Extra debt payment"
              value={plan.extraDebt}
              max={Math.min(state.debt, Math.max(0, leftover - plan.save - plan.invest))}
              onChange={(v) => setPlan({ extraDebt: v })}
            />
          </div>
        </div>

        <div className="mq-card mt-10 border-alert p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              {ev.emoji}
            </span>
            <div>
              <p className="text-xs font-semibold text-alert uppercase">Life event · month {state.month}</p>
              <h2 className="font-display text-xl font-bold">{ev.title}</h2>
            </div>
          </div>
          <p className="mt-3 text-muted-foreground">{ev.story}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {ev.choices.map((c) => (
              <button
                key={c.id}
                onClick={() => setChoice(c.id)}
                aria-pressed={choice === c.id}
                className={cn(
                  "rounded-xl border p-4 text-left text-sm transition-colors",
                  choice === c.id ? "border-primary bg-secondary ring-2 ring-primary" : "border-border hover:bg-secondary",
                )}
              >
                <span className="block font-semibold">{c.label}</span>
                {choice === c.id && <span className="mt-2 block text-muted-foreground">{c.result}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            onClick={finishMonth}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-lift disabled:opacity-60"
          >
            {running ? "Running month…" : `Continue Journey`} <ArrowRight className="size-4" aria-hidden />
          </button>
          {!choice && <p className="text-sm text-muted-foreground">Pick an option above first, or continue to skip it.</p>}
        </div>

        <section className="mt-14">
          <SectionTitle eyebrow="Progress" title="Achievements & XP" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["first-paycheck", "🏆 First Paycheck", "Receive your first simulated paycheck."],
              ["saver", "💰 Saver", "Reach $5,000 in simulated savings."],
              ["investor", "📈 Investor", "Make your first simulated investment."],
              ["money-smart", "🧠 Money Smart", "Finish 4 lessons."],
              ["streak", "🔥 Six-Month Streak", "Complete six simulation months."],
            ].map(([id, title, text]) => {
              const done = state.achievements.includes(id!);
              return (
                <div
                  key={id}
                  className={cn("mq-card p-5", done ? "border-reward bg-reward-soft" : "opacity-70")}
                >
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  <p className="mt-2 text-xs font-semibold">{done ? "Unlocked ✓" : "Locked"}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Row({ label, amount, positive, max }: { label: string; amount: number; positive?: boolean; max: number }) {
  const pct = Math.min(100, (Math.abs(amount) / max) * 100);
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn("mq-num font-bold", positive ? "text-gain" : "text-foreground")}>
          {positive ? "+" : "-"}
          {money(Math.abs(amount))}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-secondary">
        <div
          className={cn("h-2 rounded-full", positive ? "bg-gain" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const safeMax = Math.max(0, Math.round(max));
  return (
    <label className="mt-6 block">
      <span className="flex items-baseline justify-between text-sm font-medium">
        {label}
        <span className="mq-num font-bold">{money(Math.min(value, safeMax))}</span>
      </span>
      <input
        type="range"
        min={0}
        max={safeMax || 1}
        step={25}
        value={Math.min(value, safeMax)}
        onChange={(ev) => onChange(Number(ev.target.value))}
        className="mt-3 h-2 w-full accent-[var(--primary)]"
        aria-valuetext={money(Math.min(value, safeMax))}
      />
      <span className="mt-1 block text-xs text-muted-foreground">Up to {money(safeMax)} available</span>
    </label>
  );
}
