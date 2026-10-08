import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle } from "@/components/mq/bits";
import { DISCLAIMER, SUPPORT_EMAIL } from "@/lib/mq/data";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Prafund — privacy, disclaimer and contact" },
      {
        name: "description",
        content:
          "Why Prafund exists, what data it does and does not collect, the educational simulation disclaimer, and how to reach the team.",
      },
      { property: "og:title", content: "About Prafund" },
      { property: "og:description", content: "An educational financial simulator built for students, with no real money." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <Shell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <SectionTitle
          eyebrow="About"
          title="Money lessons stick when you make the decision yourself"
          sub="Prafund was built for high-school and college students who want to understand budgeting, saving, debt and investing without risking a dollar."
        />

        <div className="mq-card mt-8 p-6">
          <h2 className="font-display text-xl font-bold">What we never ask for</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Bank or brokerage account details</li>
            <li>Your real investment balances</li>
            <li>Social Security numbers or ID documents</li>
            <li>Any personal information the simulation does not need</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Every dollar in Prafund is fictional. Your journey is stored on your own device.
          </p>
        </div>

        <div className="mq-card mt-4 bg-info-soft p-6">
          <h2 className="font-display text-xl font-bold">Financial disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed">{DISCLAIMER}</p>
        </div>

        <div className="mq-card mt-4 p-6">
          <h2 className="font-display text-xl font-bold">Contact</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            General questions, technical support, feedback and account help all go to one inbox:
          </p>
          <a className="mt-2 block break-all font-semibold text-info" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          <Link to="/help" className="mt-4 inline-block rounded-xl border border-border px-5 py-3 text-sm font-semibold">
            Open the Help Center
          </Link>
        </div>
      </div>
    </Shell>
  );
}
