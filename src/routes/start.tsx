import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/components/mq/Shell";
import { SimBadge } from "@/components/mq/bits";
import { CAREERS, HOUSING, LIFESTYLE, TRANSPORT, type Option } from "@/lib/mq/data";
import { money } from "@/lib/mq/engine";
import { newGame, useGame } from "@/lib/mq/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start your journey — Prafund setup" },
      {
        name: "description",
        content: "Choose a simulated career, housing, transport and lifestyle, then receive your first paycheck.",
      },
      { property: "og:title", content: "Start your Prafund journey" },
      { property: "og:description", content: "Pick a career and lifestyle in under a minute and start month one." },
    ],
  }),
  component: Start,
});

function Start() {
  const [step, setStep] = useState(0);
  const [career, setCareer] = useState(CAREERS[0]!.id);
  const [housing, setHousing] = useState(HOUSING[1]!.id);
  const [transport, setTransport] = useState(TRANSPORT[1]!.id);
  const [lifestyle, setLifestyle] = useState(LIFESTYLE[1]!.id);
  const { save } = useGame();
  const navigate = useNavigate();

  const finish = () => {
    save(newGame(career, housing, transport, lifestyle));
    navigate({ to: "/dashboard" });
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-secondary")} />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Step {step + 1} of 3</p>

        {step === 0 && (
          <div className="mq-card mt-6 p-8">
            <SimBadge>Welcome</SimBadge>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Let&apos;s build your financial future.</h1>
            <p className="mt-4 text-muted-foreground">
              Your decisions will affect your simulated financial life. Experiment, learn, and see what happens. No real
              money is involved and we never ask for bank details.
            </p>
            <button
              onClick={() => setStep(1)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground"
            >
              Let&apos;s Go <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6">
            <h1 className="text-3xl font-bold">Choose a career</h1>
            <p className="mt-2 text-muted-foreground">
              Every figure below is a simulation value used for teaching, not a promised salary.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {CAREERS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCareer(c.id)}
                  aria-pressed={career === c.id}
                  className={cn(
                    "mq-card p-5 text-left transition-colors",
                    career === c.id ? "border-primary ring-2 ring-primary" : "hover:bg-secondary",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl" aria-hidden>
                      {c.emoji}
                    </span>
                    {career === c.id && <Check className="size-5 text-primary" aria-hidden />}
                  </div>
                  <p className="mt-2 font-bold">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
                  <p className="mq-num mt-3 text-lg font-bold">{money(c.salary)}/yr</p>
                  <p className="text-sm text-muted-foreground">
                    ≈ {money(c.takeHome)}/mo take-home <span className="text-info">· simulated</span>
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(0)} className="rounded-xl border border-border px-5 py-3 font-semibold">
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
              >
                Next <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <h1 className="text-3xl font-bold">Choose your lifestyle</h1>
            <p className="mt-2 text-muted-foreground">
              These choices set your simulated monthly expenses. There is no correct answer — only tradeoffs.
            </p>
            <Picker title="Housing" options={HOUSING} value={housing} onChange={setHousing} />
            <Picker title="Transportation" options={TRANSPORT} value={transport} onChange={setTransport} />
            <Picker title="Lifestyle" options={LIFESTYLE} value={lifestyle} onChange={setLifestyle} />
            <div className="mt-8 flex gap-3">
              <button onClick={() => setStep(1)} className="rounded-xl border border-border px-5 py-3 font-semibold">
                Back
              </button>
              <button
                onClick={finish}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
              >
                Receive my first paycheck <ArrowRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Picker({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="mt-8">
      <legend className="font-display text-lg font-bold">{title}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={cn(
              "mq-card flex items-center justify-between p-4 text-left",
              value === o.id ? "border-primary ring-2 ring-primary" : "hover:bg-secondary",
            )}
          >
            <span>
              <span className="block font-semibold">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.note}</span>
            </span>
            <span className="mq-num font-bold">{money(o.cost)}/mo</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
