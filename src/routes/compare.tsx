import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle, SimBadge, StatCard } from "@/components/mq/bits";
import { CAREERS, HOUSING } from "@/lib/mq/data";
import { EDUCATIONS, LOCATIONS, projectLifePath, type LifePathChoices } from "@/lib/mq/lifepath";
import { money } from "@/lib/mq/engine";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "What-If Comparison — Prafund" },
      {
        name: "description",
        content:
          "Compare two versions of your future — living at home vs renting, two careers, two education paths — side by side with the assumptions spelled out.",
      },
      { property: "og:title", content: "What-If Comparison — Prafund" },
      { property: "og:description", content: "Two futures, same simulation, side by side." },
    ],
  }),
  component: Compare,
});

const defaultA: LifePathChoices = {
  careerId: CAREERS[0]!.id,
  educationId: "community",
  locationId: "midsize",
  housingId: "parents",
};

const defaultB: LifePathChoices = {
  careerId: CAREERS[0]!.id,
  educationId: "community",
  locationId: "midsize",
  housingId: "apartment",
};

function Compare() {
  const [a, setA] = useState<LifePathChoices>(defaultA);
  const [b, setB] = useState<LifePathChoices>(defaultB);

  const ra = useMemo(() => projectLifePath(a), [a]);
  const rb = useMemo(() => projectLifePath(b), [b]);

  const chartData = ra.years.map((ya, i) => ({
    year: `Y${ya.year}`,
    A: ya.netWorth,
    B: rb.years[i]!.netWorth,
  }));
  const gap = ra.finalNetWorth - rb.finalNetWorth;

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <SectionTitle
          eyebrow="What-if comparison"
          title="Two versions of your future"
          sub="Set up path A and path B, then see monthly-style cash flow, savings and assumptions for each. Same simulation, same timeframe — only the choices differ."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel label="Path A" tone="gain" choices={a} onChange={setA} />
          <Panel label="Path B" tone="info" choices={b} onChange={setB} />
        </div>

        <div className="mq-card mt-6 p-5">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-lg font-bold">Net worth over five years</p>
            <SimBadge>Simulated</SimBadge>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -12, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                <ReTooltip formatter={(v: number) => money(v)} />
                <Legend />
                <Bar dataKey="A" fill="var(--gain)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" fill="var(--info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="A final net worth" value={money(ra.finalNetWorth)} tone="gain" />
          <StatCard title="B final net worth" value={money(rb.finalNetWorth)} tone="info" />
          <StatCard
            title="Gap after 5 years"
            value={`${gap >= 0 ? "A" : "B"} by ${money(Math.abs(gap))}`}
            tone="neutral"
          />
          <StatCard
            title="A head start"
            value={ra.monthsStudying < rb.monthsStudying ? `${rb.monthsStudying - ra.monthsStudying} mo income` : "—"}
            hint="Months of income A earns while B is still studying (and vice versa in the debt column)."
          />
        </div>

        <div className="mq-card mt-6 p-5">
          <p className="font-display text-lg font-bold">Monthly cash flow at a glance</p>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Metric</th>
                <th className="py-2">Path A</th>
                <th className="py-2">Path B</th>
              </tr>
            </thead>
            <tbody>
              <Row label="First take-home" va={money(ra.takeHomeFirstJob)} vb={money(rb.takeHomeFirstJob)} />
              <Row label="Student debt added" va={money(ra.studentDebt)} vb={money(rb.studentDebt)} />
              <Row label="Months studying" va={`${ra.monthsStudying}`} vb={`${rb.monthsStudying}`} />
              <Row label="Total saved in 5 yrs" va={money(ra.totalSaved)} vb={money(rb.totalSaved)} />
              <Row label="Debt remaining (Y5)" va={money(ra.years[4]!.debt)} vb={money(rb.years[4]!.debt)} />
              <Row label="Final net worth" va={money(ra.finalNetWorth)} vb={money(rb.finalNetWorth)} highlight />
            </tbody>
          </table>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeftRight className="size-4" aria-hidden />
            Same engine, two choice sets — the difference is purely the decisions, not luck.
          </p>
        </div>

        <div className="mq-card mt-6 p-5 text-sm">
          <p className="font-semibold">Assumptions</p>
          <p className="mt-2 text-muted-foreground">
            Both paths assume 2.5%/yr simulated raises, 2%/yr rent growth, 60% of monthly leftover saved, and no random
            life events. Figures are teaching values, not guarantees or financial advice.
          </p>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, va, vb, highlight }: { label: string; va: string; vb: string; highlight?: boolean }) {
  return (
    <tr className={highlight ? "border-t border-border bg-secondary" : "border-t border-border"}>
      <td className="py-2 font-medium">{label}</td>
      <td className="py-2 mq-num font-bold text-gain">{va}</td>
      <td className="py-2 mq-num font-bold text-info">{vb}</td>
    </tr>
  );
}

function Panel({
  label,
  tone,
  choices,
  onChange,
}: {
  label: string;
  tone: "gain" | "info";
  choices: LifePathChoices;
  onChange: (c: LifePathChoices) => void;
}) {
  const set = (patch: Partial<LifePathChoices>) => onChange({ ...choices, ...patch });
  return (
    <div className={`mq-card p-5 ${tone === "gain" ? "border-gain" : ""}`}>
      <p className={`font-display text-lg font-bold ${tone === "gain" ? "text-gain" : "text-info"}`}>{label}</p>
      <Select
        title="Career"
        value={choices.careerId}
        onChange={(careerId) => set({ careerId })}
        options={CAREERS.map((c) => ({ id: c.id, label: `${c.emoji} ${c.title}` }))}
      />
      <Select
        title="Education"
        value={choices.educationId}
        onChange={(educationId) => set({ educationId })}
        options={EDUCATIONS.map((e) => ({ id: e.id, label: e.label }))}
      />
      <Select
        title="Location"
        value={choices.locationId}
        onChange={(locationId) => set({ locationId })}
        options={LOCATIONS.map((l) => ({ id: l.id, label: l.label }))}
      />
      <Select
        title="Housing"
        value={choices.housingId}
        onChange={(housingId) => set({ housingId })}
        options={HOUSING.map((h) => ({ id: h.id, label: h.label }))}
      />
    </div>
  );
}

function Select({
  title,
  value,
  onChange,
  options,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="mt-4 block text-sm">
      <span className="font-semibold">{title}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
