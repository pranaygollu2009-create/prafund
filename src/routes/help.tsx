import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle } from "@/components/mq/bits";
import { DISCLAIMER, SUPPORT_EMAIL } from "@/lib/mq/data";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center & contact — Prafund" },
      {
        name: "description",
        content:
          "Answers about getting started, budgeting, investing and the Prafund simulation, plus a contact form and support email.",
      },
      { property: "og:title", content: "Prafund Help Center" },
      { property: "og:description", content: "Search help topics or send a message to the Prafund team." },
    ],
  }),
  component: Help,
});

const TOPICS = [
  {
    cat: "Getting Started",
    q: "How do I begin?",
    a: "Tap Start Playing, choose a career and a lifestyle, and your first simulated paycheck arrives immediately. Setup takes about a minute.",
  },
  {
    cat: "Getting Started",
    q: "Is my progress saved?",
    a: "Yes — your journey is stored on this device, so you can come back and continue where you left off. Accounts that sync across devices are planned next.",
  },
  {
    cat: "Budgeting",
    q: "How are my expenses calculated?",
    a: "Housing, transport and lifestyle choices each carry a simulated monthly cost. Together they set your fixed expenses, and whatever is left is yours to save, invest or keep as cash.",
  },
  {
    cat: "Budgeting",
    q: "What is a financial health score?",
    a: "It is a transparent score out of 100 built from your simulated savings rate, emergency fund, debt level, investing and lessons finished. The dashboard lists every part and its points.",
  },
  {
    cat: "Investing",
    q: "What does the Return Simulator do?",
    a: "It runs 10,000 random scenarios on your chosen mix of stocks, bonds and cash, then shows a lower, median and higher outcome so you can see how much results can vary.",
  },
  {
    cat: "Investing",
    q: "Are these real returns?",
    a: "No. The simulator uses long-run average return and volatility assumptions for teaching. Nothing it shows is a prediction or a guarantee.",
  },
  {
    cat: "Simulation",
    q: "Why do unexpected events appear?",
    a: "Real money life is interrupted by car repairs, bills and opportunities. Events force a tradeoff so you can see how a plan holds up.",
  },
  {
    cat: "Account",
    q: "Can I start over?",
    a: "Yes. Use Reset journey on the dashboard. This clears your simulated numbers and lets you pick a new career.",
  },
  {
    cat: "Technical Support",
    q: "Something looks broken.",
    a: `Email ${SUPPORT_EMAIL} with what you were doing and we will take a look.`,
  },
];

function Help() {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      TOPICS.filter(
        (t) =>
          t.q.toLowerCase().includes(query.toLowerCase()) ||
          t.a.toLowerCase().includes(query.toLowerCase()) ||
          t.cat.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <Shell>
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <SectionTitle eyebrow="Help center" title="What do you need help with?" />
        <label className="mt-6 flex items-center gap-2 rounded-xl border border-input bg-background px-4 py-3">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <span className="sr-only">Search help topics</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: budgeting, investing, reset…"
            className="w-full bg-transparent text-sm focus-visible:outline-none"
          />
        </label>

        <div className="mt-6 space-y-3">
          {results.map((t) => (
            <details key={t.q} className="mq-card p-5">
              <summary className="cursor-pointer font-semibold">
                <span className="mr-2 rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">{t.cat}</span>
                {t.q}
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{t.a}</p>
            </details>
          ))}
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing matched. Email <a className="text-info" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we
              will help.
            </p>
          )}
        </div>

        <section className="mt-16">
          <SectionTitle eyebrow="Contact" title="Send us a message" sub={`Or email ${SUPPORT_EMAIL} directly.`} />
          <form
            className="mq-card mt-6 space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const body = encodeURIComponent(
                `From: ${data.get("name")} (${data.get("email")})\n\n${data.get("message")}`,
              );
              window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                `Prafund — ${data.get("topic")}`,
              )}&body=${body}`;
              toast.success("Opening your email app with the message ready to send.");
            }}
          >
            <Field name="name" label="Name or username" />
            <Field name="email" label="Email" type="email" />
            <label className="block">
              <span className="text-sm font-medium">Topic</span>
              <select
                name="topic"
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm"
              >
                <option>General question</option>
                <option>Technical support</option>
                <option>Feedback &amp; suggestions</option>
                <option>Account assistance</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Message</span>
              <textarea
                name="message"
                required
                rows={5}
                className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm"
              />
            </label>
            <button type="submit" className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">
              Send message
            </button>
          </form>
        </section>

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </Shell>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm"
      />
    </label>
  );
}
