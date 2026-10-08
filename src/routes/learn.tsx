import { createFileRoute } from "@tanstack/react-router";
import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle } from "@/components/mq/bits";
import { GLOSSARY, LESSONS } from "@/lib/mq/data";
import { useGame } from "@/lib/mq/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn Center — short money lessons & glossary | Prafund" },
      {
        name: "description",
        content:
          "Two-minute lessons on budgeting, compound growth, emergency funds, credit and inflation, each with a quick question and XP, plus a beginner glossary.",
      },
      { property: "og:title", content: "Prafund Learn Center" },
      { property: "og:description", content: "Short interactive lessons and a plain-English financial glossary." },
    ],
  }),
  component: Learn,
});

function Learn() {
  const { state, save } = useGame();
  const [query, setQuery] = useState("");
  const [daily, setDaily] = useState<number | null>(null);

  const terms = useMemo(
    () =>
      GLOSSARY.filter(
        ([t, d]) =>
          t.toLowerCase().includes(query.toLowerCase()) || d.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  const complete = (id: string, xp: number) => {
    if (!state || state.lessonsDone.includes(id)) return;
    save({ ...state, lessonsDone: [...state.lessonsDone, id], xp: state.xp + xp });
  };

  return (
    <Shell>
      <div className="mx-auto w-full max-w-5xl px-4 py-12">
        <SectionTitle
          eyebrow="Learn center"
          title="Short lessons, one question each"
          sub="Read for two minutes, answer one question, earn XP. Your progress is saved with your journey."
        />
        {state && (
          <p className="mt-4 text-sm font-semibold text-reward">
            {state.xp} XP · {state.lessonsDone.length} of {LESSONS.length} lessons finished
          </p>
        )}
        {!state && (
          <p className="mt-4 text-sm text-muted-foreground">
            Start a journey to keep your XP and lesson progress. You can still read and answer everything now.
          </p>
        )}

        <div className="mt-8 space-y-4">
          {LESSONS.map((l) => (
            <Lesson
              key={l.id}
              lesson={l}
              done={!!state?.lessonsDone.includes(l.id)}
              onComplete={() => complete(l.id, l.xp)}
            />
          ))}
        </div>

        <section className="mt-16">
          <SectionTitle eyebrow="Daily money challenge" title="One question a day" />
          <div className="mq-card mt-6 p-6">
            <p className="font-semibold">What generally happens to purchasing power when inflation rises?</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {["It rises", "It falls", "It stays the same"].map((opt, i) => (
                <button
                  key={opt}
                  onClick={() => setDaily(i)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-sm font-medium",
                    daily === i ? "border-primary ring-2 ring-primary" : "border-border hover:bg-secondary",
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            {daily !== null && (
              <p className={cn("mt-4 text-sm font-semibold", daily === 1 ? "text-gain" : "text-alert")}>
                {daily === 1 ? "Correct! ✓ +50 XP" : "Not quite ✗"} — when prices rise, each dollar buys less, so
                purchasing power falls.
              </p>
            )}
          </div>
        </section>

        <section className="mt-16">
          <SectionTitle eyebrow="Glossary" title="Financial terms in plain English" />
          <label className="mt-6 flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-3">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <span className="sr-only">Search the glossary</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a term, e.g. volatility"
              className="w-full bg-transparent text-sm focus-visible:outline-none"
            />
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {terms.map(([term, def]) => (
              <div key={term} className="mq-card p-4">
                <p className="font-semibold">{term}</p>
                <p className="mt-1 text-sm text-muted-foreground">{def}</p>
              </div>
            ))}
            {terms.length === 0 && (
              <p className="text-sm text-muted-foreground">No terms matched. Try a shorter search.</p>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}

function Lesson({
  lesson,
  done,
  onComplete,
}: {
  lesson: (typeof LESSONS)[number];
  done: boolean;
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className={cn("mq-card p-6", done && "border-gain")}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block font-display text-lg font-bold">{lesson.title}</span>
          <span className="block text-sm text-muted-foreground">
            {lesson.minutes} min · +{lesson.xp} XP
          </span>
        </span>
        {done ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-gain">
            <Check className="size-4" aria-hidden /> Done
          </span>
        ) : (
          <span className="text-sm font-semibold text-info">{open ? "Hide" : "Open"}</span>
        )}
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-muted-foreground">{lesson.body}</p>
          <p className="mt-5 font-semibold">{lesson.question}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {lesson.options.map((o, i) => (
              <button
                key={o}
                onClick={() => {
                  setPicked(i);
                  if (i === lesson.answer) onComplete();
                }}
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm font-medium",
                  picked === i
                    ? i === lesson.answer
                      ? "border-gain bg-gain-soft"
                      : "border-alert bg-alert-soft"
                    : "border-border hover:bg-secondary",
                )}
              >
                {o}
              </button>
            ))}
          </div>
          {picked !== null && (
            <p className="mt-4 text-sm">
              <span className={cn("font-bold", picked === lesson.answer ? "text-gain" : "text-alert")}>
                {picked === lesson.answer ? `Correct! ✓ +${lesson.xp} XP` : "Not quite ✗"}
              </span>{" "}
              {lesson.why}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
