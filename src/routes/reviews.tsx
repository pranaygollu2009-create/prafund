import { createFileRoute } from "@tanstack/react-router";
import { Star, Trash2, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle } from "@/components/mq/bits";
import { SEED_REVIEWS, type Review } from "@/lib/mq/seed-reviews";
import {
  canDeleteWallReview,
  listCommunity,
  loadLocal,
  postReview,
  removeOwnReview,
  saveLocal,
} from "@/lib/mq/reviews";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      {
        title: "Reviews — Prafund",
        name: "description",
        content:
          "200+ student reviews of the Prafund financial simulator. Post your own review — the wall updates live for everyone.",
      },
      { property: "og:title", content: "Reviews — Prafund" },
      { property: "og:description", content: "Student reviews of the Prafund financial simulator." },
    ],
  }),
  component: Reviews,
});

type Filter = "all" | 5 | 4 | 3 | 2 | 1;
type Sort = "recent" | "high" | "low";
const PAGE = 24;

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
          <Star className={`size-4 ${i <= n ? "fill-reward text-reward" : "text-border"}`} />
        </button>
      ))}
    </div>
  );
}

function when(iso: string) {
  const then = new Date(iso);
  const diff = Date.now() - then.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Reviews() {
  const [community, setCommunity] = useState<Review[]>([]);
  const [local, setLocal] = useState<Review[]>([]);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(PAGE);
  const [toast, setToast] = useState<{ msg: string; good: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocal(loadLocal());
    let alive = true;
    const refresh = () =>
      listCommunity().then((res) => {
        if (alive && res.available) setCommunity(res.rows);
      });
    refresh();
    const timer = setInterval(refresh, 15_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const wall = community.length ? community : [];
  const merged = useMemo(
    () => [...local, ...wall, ...SEED_REVIEWS].sort((a, b) => b.at.localeCompare(a.at)),
    [local, wall],
  );

  const avg = merged.length ? merged.reduce((s, r) => s + r.rating, 0) / merged.length : 0;
  const buckets = useMemo(() => {
    const b = [0, 0, 0, 0, 0]; // index 0 => 5 stars
    for (const r of merged) {
      const bi = 5 - r.rating;
      b[bi] = (b[bi] ?? 0) + 1;
    }
    return b;
  }, [merged]);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return sort === "recent"
        ? merged
        : [...merged].sort(
            (a, b) =>
              sort === "high" ? b.rating - a.rating || b.at.localeCompare(a.at) : a.rating - b.rating || b.at.localeCompare(a.at),
          );
    }
    const active = filter as number;
    const base = merged.filter((r) => r.rating === active);
    if (sort === "high") return [...base].sort((a, b) => b.rating - a.rating || b.at.localeCompare(a.at));
    if (sort === "low") return [...base].sort((a, b) => a.rating - b.rating || b.at.localeCompare(a.at));
    return base;
  }, [merged, filter, sort]);

  useEffect(() => setShown(PAGE), [filter, sort]);

  function showToast(msg: string, good: boolean) {
    setToast({ msg, good });
    setTimeout(() => setToast(null), 6000);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const myName = name.trim() || "Anonymous";
    if (text.trim().length < 3) return;
    setBusy(true);
    try {
      const res = await postReview({
        name: myName.slice(0, 40),
        rating,
        body: text.trim().slice(0, 400),
      });
      if (res.ok) {
        setCommunity((prev) => [res.review, ...prev]);
        setToast({ msg: "Posted! Your review is on the wall — updates live for every visitor.", good: true });
      } else {
        // Supabase unreachable (e.g. demo build): keep it on this device only.
        const fallback: Review = {
          id: `local-${Date.now()}`,
          name: myName.slice(0, 40),
          rating,
          body: text.trim(),
          at: new Date().toISOString(),
          kind: "local",
        };
        const next = [fallback, ...loadLocal()];
        saveLocal(next);
        setLocal(next);
        setToast({ msg: "Could not reach the reviews service — your review is saved on this device for now.", good: false });
      }
      setName("");
      setText("");
      setRating(5);
      setFilter("all");
      setShown((n) => Math.max(n, PAGE));
    } finally {
      setBusy(false);
    }
  }

  async function removeMe(r: Review) {
    if (r.kind === "wall" && canDeleteWallReview(r.id)) {
      const done = await removeOwnReview(r.id);
      if (done) setCommunity((prev) => prev.filter((x) => x.id !== r.id));
      return;
    }
    if (r.kind === "local") {
      const next = loadLocal().filter((x) => x.id !== r.id);
      saveLocal(next);
      setLocal(next);
    }
  }

  async function manualRefresh() {
    const res = await listCommunity();
    if (res.available) {
      setCommunity(res.rows);
      setToast({ msg: "Wall refreshed — you're looking at the latest posts.", good: true });
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <SectionTitle
          eyebrow="Reviews"
          title="What students say about Prafund"
          sub="200+ reviews from people learning money by making decisions, plus your own. The wall updates live: when anyone posts, it appears for every visitor without reloading."
        />

        <div className="mq-card mt-8 flex items-center gap-6 p-6">
          <div>
            <p className="mq-num font-display text-4xl font-bold">{avg ? avg.toFixed(1) : "—"}</p>
            <Stars n={Math.round(avg)} />
            <p className="mt-1 text-xs text-muted-foreground">{merged.length.toLocaleString()} reviews</p>
          </div>
          <ul className="flex-1 space-y-1 text-xs">
            {[5, 4, 3, 2, 1].map((i, bi) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-4 text-right tabular-nums">{i}</span>
                <Star className="size-3 fill-reward text-reward" aria-hidden />
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <span
                    className="block h-full rounded-full bg-reward"
                    style={{ width: `${merged.length ? ((buckets[bi] ?? 0) / merged.length) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-8 tabular-nums text-muted-foreground">{buckets[bi]}</span>
              </li>
            ))}
          </ul>
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
              <div className="mt-2">
                <Stars n={rating} onPick={setRating} />
              </div>
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
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              New reviews post publicly and appear on this wall for everyone in real time.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Posting…" : "Post review"}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["all", 5, 4, 3, 2, 1] as Filter[]).map((f) => (
              <button
                key={String(f)}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                }`}
              >
                {f === "all" ? "All" : `${f}★`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="sortsel">
              Sort
            </label>
            <select
              id="sortsel"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
            >
              <option value="recent">Most recent</option>
              <option value="high">Highest rated</option>
              <option value="low">Lowest rated</option>
            </select>
            <button
              onClick={manualRefresh}
              aria-label="Refresh reviews"
              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary"
            >
              <RefreshCcw className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {filtered.slice(0, shown).map((r) => (
            <article key={r.id} className="mq-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {r.name}
                    {r.kind === "local" && (
                      <span className="ml-2 rounded-full bg-alert/10 px-2 py-0.5 text-[10px] font-medium text-alert">
                        this device only
                      </span>
                    )}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Stars n={r.rating} />
                    <span className="text-xs text-muted-foreground">{when(r.at)}</span>
                  </div>
                </div>
                {(r.kind === "local" || (r.kind === "wall" && canDeleteWallReview(r.id))) && (
                  <button
                    onClick={() => removeMe(r)}
                    aria-label={`Delete review by ${r.name}`}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </article>
          ))}
          {shown < filtered.length && (
            <button
              onClick={() => setShown((n) => n + 40)}
              className="w-full rounded-xl border border-border px-5 py-3 text-sm font-semibold"
            >
              Load more reviews ({filtered.length - shown} left)
            </button>
          )}
          {filtered.length === 0 && (
            <p className="mq-card p-6 text-center text-sm text-muted-foreground">
              No reviews match this filter yet.
            </p>
          )}
        </div>

        {toast && (
          <div
            role="status"
            className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium shadow-lift lg:bottom-8 ${
              toast.good ? "bg-reward text-reward-foreground" : "bg-alert text-alert-foreground"
            }`}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </Shell>
  );
}
