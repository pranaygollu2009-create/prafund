import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";
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
import { SectionTitle, SimBadge, StatCard } from "@/components/mq/bits";
import { CAREERS, HOUSING, type Option } from "@/lib/mq/data";
import { EDUCATIONS, LOCATIONS, projectLifePath, type LifePathChoices } from "@/lib/mq/lifepath";
import { money } from "@/lib/mq/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lifepath")({
  head: () => ({
    meta: [
      { title: "Life Path Simulator — Prafund" },
      {
        name: "description",
        content:
          "Simulate five years after high school: choose education, career, city and housing, then see how each choice changes savings and debt.",
      },
      { property: "og:title", content: "Life Path Simulator — Prafund" },
      { property: "og:description", content: "See how today's choices shape five simulated years." },
    ],
  }),
  component: LifePath,
});

function LifePath() {
  const [choices, setChoices] = useState<LifePathChoices>({
    careerId: CAREERS[0]!.id,
    educationId: "community",
    locationId: "midsize",
    housingId: "roommates",
  });

  const result = useMemo(() => projectLifePath(choices), [choices]);
  const chartData = result.years.map((y) => ({
    year: `Y${y.year}`,
    netWorth: y.netWorth,
    debt: -y.debt,
  }));

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <SectionTitle
          eyebrow="Life path simulator"
          title="Five years after high school"
          sub="Pick an education path, career, city and housing situation. The simulator projects how those choices compound over 60 months."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <Choices
              title="Education path"
              options={EDUCATIONS.map((e) => ({
                id: e.id,
                label: e.label,
                note: e.note,
                cost: e.debtAdded,
              }))}
              value={choices.educationId}
              onChange={(educationId) => setChoices({ ...choices, educationId })}
              costSuffix=" student debt"
            />
            <Choices
              title="Career"
              options={CAREERS.map((c) => ({
                id: c.id,
                label: c.title,
                note: c.blurb,
                cost: c.takeHome,
              }))}
              value={choices.careerId}
              onChange={(careerId) => setChoices({ ...choices, careerId })}
              costSuffix="/mo take-home"
            />
            <Choices
              title="Where you live"
              options={LOCATIONS.map((l) => ({
                id: l.id,
                label: l.label,
                note: l.note,
                cost: 0,
              }))}
              value={choices.locationId}
              onChange={(locationId) => setChoices({ ...choices, locationId })}
            />
            <Choices
              title="Housing"
              options={HOUSING.map((h) => ({
                id: h.id,
                label: h.label,
                note: h.note,
                cost: h.cost,
              }))}
              value={choices.housingId}
              onChange={(housingId) => setChoices({ ...choices, housingId })}
              costSuffix="/mo rent"
            />
          </div>

          <div className="space-y-4">
            <div className="mq-card p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-lg font-bold">Your five-year projection</p>
                <SimBadge>Simulated · assumptions shown below</SimBadge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StatCard title="Final net worth" value={money(result.finalNetWorth)} tone="gain" />
                <StatCard title="Total saved" value={money(result.totalSaved)} tone="info" />
                <StatCard
                  title="Debt left after 5 yrs"
                  value={money(result.years[4]!.debt)}
                  tone={result.years[4]!.debt > 0 ? "alert" : "gain"}
                />
              </div>
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -12, right: 6, top: 6 }}>
                    <defs>
                      <linearGradient id="lp-nw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--gain)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <ReTooltip formatter={(v: number) => money(v)} />
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      stroke="var(--gain)"
                      strokeWidth={2}
                      fill="url(#lp-nw)"
                      name="Net worth"
                    />
                    <Area
                      type="monotone"
                      dataKey="debt"
                      stroke="var(--alert)"
                      strokeWidth={2}
                      fill="none"
                      name="Debt (negative)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <table className="mt-6 w-full text-sm">
                <caption className="sr-only">Yearly projection detail</caption>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">Year</th>
                    <th className="py-2">Earned</th>
                    <th className="py-2">Spent</th>
                    <th className="py-2">Saved</th>
                    <th className="py-2">Savings</th>
                    <th className="py-2">Debt</th>
                    <th className="py-2">Net worth</th>
                  </tr>
                </thead>
                <tbody>
                  {result.years.map((y) => (
                    <tr key={y.year} className="border-t border-border">
                      <td className="py-2 font-semibold">{y.ageLabel}</td>
                      <td className="py-2 mq-num">{money(y.earned)}</td>
                      <td className="py-2 mq-num">{money(y.spent)}</td>
                      <td className="py-2 mq-num">{money(y.saved)}</td>
                      <td className="py-2 mq-num">{money(y.savings)}</td>
                      <td className={cn("py-2 mq-num", y.debt > 0 && "text-alert")}>{money(y.debt)}</td>
                      <td className="py-2 mq-num font-bold">{money(y.netWorth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <details className="mt-6 rounded-xl border border-border p-4 text-sm">
                <summary className="cursor-pointer font-semibold">Assumptions behind these numbers</summary>
                <ul className="mt-3 space-y-1 text-muted-foreground">
                  <li>· Take-home starts at {money(result.takeHomeFirstJob)}/mo; 2.5%/yr simulated raises, nothing guaranteed.</li>
                  <li>
                    · Housing rent is {result.housingLabel.toLowerCase()} adjusted for {result.locationLabel.toLowerCase()} —
                    it grows 2%/yr.
                  </li>
                  <li>· 60% of each month's leftover goes to savings, 40% stays as cash.</li>
                  <li>· Extra leftover pays simulated student debt first, which accrues interest.</li>
                  <li>· Education delays income by {result.monthsStudying} months and adds {money(result.studentDebt)} debt up front.</li>
                  <li>· No emergencies, promotions or raises beyond the step increase here — this is the smooth-path baseline.</li>
                </ul>
              </details>
            </div>

            <div className="mq-card p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Want surprises beyond the smooth path? The main simulator adds unexpected life events every month.
              </p>
              <Link
                to="/dashboard"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                Try the monthly simulator <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Choices({
  title,
  options,
  value,
  onChange,
  costSuffix = "",
}: {
  title: string;
  options: (Option | { id: string; label: string; note: string; cost: number })[];
  value: string;
  onChange: (v: string) => void;
  costSuffix?: string;
}) {
  return (
    <fieldset>
      <legend className="font-display text-lg font-bold">{title}</legend>
      <div className="mt-3 grid gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={cn(
              "mq-card flex items-center justify-between gap-3 p-4 text-left",
              value === o.id ? "border-primary ring-2 ring-primary" : "hover:bg-secondary",
            )}
          >
            <span>
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.note}</span>
            </span>
            {(o.cost > 0 || costSuffix === "/mo take-home") && (
              <span className="mq-num shrink-0 text-right text-sm font-bold">
                {money(o.cost)}
                {costSuffix === "/mo student debt" ? "" : costSuffix === "/mo take-home" ? "/mo" : ""}
              </span>
            )}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
