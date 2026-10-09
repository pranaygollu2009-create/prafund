import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Dices, LineChart, PiggyBank, Sparkles } from "lucide-react";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle, SimBadge, StatCard } from "@/components/mq/bits";
import { QuoteCard, TickerTape } from "@/components/mq/market";
import { marketIndex, pctLabel } from "@/lib/mq/market";
import { useMarket } from "@/lib/mq/useMarket";
import { useGame } from "@/lib/mq/store";
import { financialHealth, money, netWorth } from "@/lib/mq/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prafund — Free financial life simulator game for students (budgeting & investing)" },
      {
        name: "description",
        content:
          "Prafund is a free financial life simulator game for students: pick a career, budget your paycheck, invest simulated money in real-ticker markets, and learn money by making decisions — no real money, no signup needed.",
      },
      { property: "og:title", content: "Prafund — What would you do with your first paycheck?" },
      {
        property: "og:description",
        content: "A free financial life simulator for students. Learn money by making decisions.",
      },
    ],
  }),
  component: Home,
});

const STEPS = [
  {
    icon: Sparkles,
    title: "Build your life",
    text: "Choose a career and a lifestyle you can picture.",
  },
  {
    icon: PiggyBank,
    title: "Make decisions",
    text: "Split each paycheck between spending, saving and investing.",
  },
  { icon: Dices, title: "Face reality", text: "Random events like a car repair test your plan." },
  {
    icon: LineChart,
    title: "See what happens",
    text: "Track net worth, health score and what each choice cost.",
  },
];

function DashboardPreview() {
  const { state, loaded } = useGame();

  if (!loaded) {
    return (
      <div className="mq-card bg-surface p-6 text-center text-sm text-muted-foreground">
        Loading your dashboard…
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mq-card bg-surface p-6 text-center">
        <p className="text-sm font-semibold text-muted-foreground">Your dashboard preview</p>
        <p className="mt-4 font-display text-xl font-bold">No journey yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Start a simulation and your real numbers — cash, savings, investments and debt — will show
          up here.
        </p>
        <Link
          to="/start"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Start Playing <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    );
  }

  const health = financialHealth(state);
  const cards = [
    { t: "Cash", v: money(state.cash) },
    { t: "Savings", v: money(state.savings) },
    { t: "Investments", v: money(state.investments) },
    { t: "Debt", v: money(state.debt) },
  ];

  return (
    <div className="mq-card bg-surface p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted-foreground">Your dashboard preview</p>
        <SimBadge>Month {state.month}</SimBadge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{c.t}</p>
            <p className="mq-num mt-1 text-xl font-bold">{c.v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Net worth</p>
          <p className="mq-num mt-1 text-2xl font-bold">{money(netWorth(state))}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Financial health</p>
          <p className="mq-num mt-1 text-2xl font-bold">{health.total} / 100</p>
          <div className="mt-2 h-2 rounded-full bg-secondary">
            <div className="h-2 rounded-full bg-gain" style={{ width: `${health.total}%` }} />
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        These are your live simulated figures. All values in Prafund are simulated.
      </p>
    </div>
  );
}

function Home() {
  return (
    <Shell>
      <LiveTape />
      <section className="mq-grid mx-auto w-full max-w-6xl px-4 pt-14 pb-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <SimBadge>Educational simulation · no real money</SimBadge>
            <h1 className="mt-5 text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              What would you do with your first paycheck?
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Build your financial future, one decision at a time. Prafund gives you a fictional
              salary, real tradeoffs, and no way to lose actual money.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/start"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lift transition-transform hover:scale-[1.02]"
              >
                Start Your Financial Journey <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                to="/how-it-works"
                className="inline-flex items-center rounded-xl border border-border bg-background px-6 py-3.5 text-base font-semibold transition-colors hover:bg-secondary"
              >
                See How It Works
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Free · Takes about a minute to set up · Progress saves to your account
            </p>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <LiveMarkets />

      <section className="border-y border-border bg-surface py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <SectionTitle
            eyebrow="How it works"
            title="Four steps, one paycheck at a time"
            sub="Every month you decide, something unexpected happens, and you see the result."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="mq-card p-6">
                <s.icon className="size-6 text-info" aria-hidden />
                <p className="mt-4 text-xs font-semibold text-muted-foreground">STEP {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
          <Link
            to="/start"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground"
          >
            Start My Journey <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          Also known as: prafund github io · pranaygollu2009 prafund · free financial life simulator game for students.
          Find us by searching those phrases, or bookmark this page in Safari or Chrome.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Return Simulator"
            value="10,000 scenarios"
            hint="Try different mixes of stocks, bonds and cash and see the whole range of outcomes — not one lucky number."
          />
          <StatCard
            title="Interactive lessons"
            value="6 to start"
            tone="info"
            hint="Short explanations with one question at the end. Answer correctly and earn XP."
          />
          <StatCard
            title="Life events"
            value="Unexpected"
            tone="alert"
            hint="Car repairs, bonuses, certifications and moves force real tradeoffs."
          />
        </div>
      </section>
    </Shell>
  );
}

function LiveTape() {
  const { snap } = useMarket(2000);
  if (!snap) return null;
  return <TickerTape quotes={snap.quotes} />;
}

function LiveMarkets() {
  const { snap, source } = useMarket(1500);
  if (!snap) return null;
  const idx = marketIndex(snap);
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow={source === "live" ? "Live market" : "Simulated market"}
          title="Watch the market move"
          sub={
            source === "live"
              ? "Real prices for real companies, refreshed every 30 seconds. No real money, no real trades — just learning."
              : "Real tickers priced by a running simulation while the live feed is offline. No real money, no real market data."
          }
        />
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
            idx >= 0 ? "bg-gain-soft text-gain" : "bg-alert-soft text-alert",
          )}
        >
          <span className="mq-live-dot" aria-hidden /> Prafund Composite{" "}
          {idx >= 0 ? "\u2191" : "\u2193"} {pctLabel(idx)}
        </span>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {snap.quotes.slice(0, 4).map((q) => (
          <QuoteCard key={q.symbol} quote={q} />
        ))}
      </div>
      <Link
        to="/markets"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold transition-colors hover:bg-secondary"
      >
        Open live markets <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
