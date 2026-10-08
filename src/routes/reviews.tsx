import { createFileRoute } from "@tanstack/react-router";
import { Star, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle } from "@/components/mq/bits";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — Prafund" },
      { name: "description", content: "See what students think of Prafund and leave your own review of the financial simulator." },
      { property: "og:title", content: "Reviews — Prafund" },
      { property: "og:description", content: "Student reviews of the Prafund financial simulator." },
    ],
  }),
  component: Reviews,
});

type Review = { name: string; rating: number; text: string; at: number };
const KEY = "prafund.reviews.v1";

const SEED: Review[] = [
  { name: "Maya R.", rating: 5, text: "Finally understand what an index fund actually is. The monthly simulation makes it click.", at: 0 },
  { name: "Devon K.", rating: 4, text: "The random car repair event got me — now I get why emergency funds matter.", at: 0 },
  { name: "Priya S.", rating: 5, text: "Way better than a textbook. I check the markets page every day now.", at: 0 },
];

function load(): Review[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Review[];
  } catch { /* ignore */ }
  return SEED;
}

function Stars({ n, onPick }: { n: number; onPick?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5" role={onPick ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type={onPick ? "button" : undefined}
          onClick={onPick ? () => onPick(i) : undefined}
          className={onPick ? "cursor-pointer" : "cursor-default"}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          tabIndex={onPick ? 0 : -1}
        >
          <Star className={`size-5 ${i <= n ? "fill-reward text-reward" : "text-border"}`} />
        </button>
      ))}
    </div>
  );
}

function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  useEffect(() => { setReviews(load()); }, []);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    const next = [{ name: name.trim(), rating, text: text.trim(), at: Date.now() }, ...reviews];
    setReviews(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    setName(""); setText(""); setRating(5);
  }

  function remove(i: number) {
    const next = reviews.filter((_, j) => j !== i);
    setReviews(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <SectionTitle
          eyebrow="Reviews"
          title="What students say about Prafund"
          sub="Honest feedback from people learning money by making decisions. Reviews are stored on your own device."
        />

        <div className="mq-card mt-8 flex items-center gap-6 p-6">
          <div>
            <p className="mq-num font-display text-4xl font-bold">{avg}</p>
            <Stars n={Math.round(Number(avg) || 0)} />
          </div>
          <p className="text-sm text-muted-foreground">
            Average rating across <strong>{reviews.length}</strong> review{reviews.length === 1 ? "" : "s"}.
          </p>
        </div>

        <form onSubmit={submit} className="mq-card mt-6 space-y-4 p-6">
          <h2 className="font-display text-lg font-bold">Leave a review</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Your name or nickname
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={40}
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
                placeholder="e.g. Alex T."
              />
            </label>
            <div className="text-sm font-medium">
              Rating
              <div className="mt-2"><Stars n={rating} onPick={setRating} /></div>
            </div>
          </div>
          <label className="block text-sm font-medium">
            Your review
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              maxLength={400}
              rows={3}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm"
              placeholder="What did you learn? What could be better?"
            />
          </label>
          <button type="submit" className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Post review
          </button>
        </form>

        <div className="mt-8 space-y-4">
          {reviews.map((r, i) => (
            <article key={`${r.name}-${r.at}-${i}`} className="mq-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <Stars n={r.rating} />
                </div>
                {r.at > 0 && (
                  <button
                    onClick={() => remove(i)}
                    aria-label={`Delete review by ${r.name}`}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
            </article>
          ))}
          {reviews.length === 0 && (
            <p className="mq-card p-6 text-center text-sm text-muted-foreground">
              No reviews yet — be the first to leave one above.
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}
