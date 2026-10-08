import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/mq/Shell";
import { SectionTitle, SimBadge } from "@/components/mq/bits";
import { useSession } from "@/lib/mq/auth";
import { levelFor, loadProfile, saveProfile, type Profile } from "@/lib/mq/cloud";
import { useGame } from "@/lib/mq/store";
import { money, netWorth } from "@/lib/mq/engine";
import { deleteMyAccount } from "@/lib/mq/account.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — Prafund" },
      { name: "description", content: "Your Prafund level, XP, achievements and account settings." },
      { property: "og:title", content: "My profile — Prafund" },
      { property: "og:description", content: "Your Prafund level, XP and account settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { state } = useGame();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    void loadProfile(user.id).then((p) => {
      setProfile(p);
      setUsername(p?.username ?? "");
    });
  }, [user]);

  async function saveUsername() {
    if (!user) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await saveProfile(user.id, { username: username.trim() });
      setNotice("Username saved.");
    } catch {
      setError("We couldn't save that username. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", search: { redirect: undefined, mode: undefined }, replace: true });
  }

  async function removeAccount() {
    if (!window.confirm("Delete your Prafund account and all saved progress? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteMyAccount();
      localStorage.removeItem("moneyquest.save.v1");
      await supabase.auth.signOut();
      void navigate({ to: "/", replace: true });
    } catch {
      setError("We couldn't delete the account. Please try again or email support.");
      setDeleting(false);
    }
  }

  const xp = state?.xp ?? profile?.xp ?? 0;

  return (
    <Shell>
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <SectionTitle eyebrow="Account" title="My profile" />
        <p className="mt-2 text-sm text-muted-foreground">{user?.email}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="mq-card p-5">
            <p className="text-sm text-muted-foreground">Level</p>
            <p className="mq-num mt-1 text-3xl">{levelFor(xp)}</p>
          </div>
          <div className="mq-card p-5">
            <p className="text-sm text-muted-foreground">XP</p>
            <p className="mq-num mt-1 text-3xl text-reward">{xp}</p>
          </div>
          <div className="mq-card p-5">
            <p className="text-sm text-muted-foreground">Months simulated</p>
            <p className="mq-num mt-1 text-3xl">{state ? state.month - 1 : 0}</p>
          </div>
        </div>

        <div className="mt-4 mq-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-lg font-bold">Simulated finances</p>
            <SimBadge />
          </div>
          {state ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Savings</dt>
                <dd className="mq-num text-xl">{money(state.savings)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Investments</dt>
                <dd className="mq-num text-xl">{money(state.investments)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Net worth</dt>
                <dd className="mq-num text-xl">{money(netWorth(state))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lessons done</dt>
                <dd className="mq-num text-xl">{state.lessonsDone.length}</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">You haven't started a journey yet.</p>
              <Link to="/start" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Start your journey →
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 mq-card p-5">
          <p className="font-display text-lg font-bold">Username</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Used instead of your real name on future leaderboards.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              aria-label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={saveUsername}
              disabled={saving || !username.trim()}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save
            </button>
          </div>
          {notice && <p className="mt-3 text-sm text-gain">✓ {notice}</p>}
          {error && (
            <p role="alert" className="mt-3 text-sm text-alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-4 mq-card p-5">
          <p className="font-display text-lg font-bold">Account & privacy</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prafund only stores your email, username and simulated progress. It never asks for
            bank, brokerage or card details.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
            <button
              type="button"
              onClick={removeAccount}
              disabled={deleting}
              className="flex items-center gap-2 rounded-md border border-alert px-4 py-2 text-sm font-semibold text-alert disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              Delete account
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
