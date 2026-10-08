import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Shell } from "@/components/mq/Shell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Prafund" },
      { name: "description", content: "Set a new password for your Prafund account." },
      { property: "og:title", content: "Choose a new password — Prafund" },
      { property: "og:description", content: "Set a new password for your Prafund account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => void navigate({ to: "/dashboard", replace: true }), 1200);
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <div className="mq-card p-8">
          <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
          {done ? (
            <p className="mt-4 text-sm text-gain">
              ✓ Password updated. Taking you to your dashboard…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="text-sm font-medium">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Save new password
              </button>
            </form>
          )}
        </div>
      </div>
    </Shell>
  );
}
