import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Shell } from "@/components/mq/Shell";
import { safePath, useSession } from "@/lib/mq/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in or sign up — Prafund" },
      {
        name: "description",
        content:
          "Create your free Prafund account to save your financial simulation and continue where you left off.",
      },
      { property: "og:title", content: "Log in or sign up — Prafund" },
      {
        property: "og:description",
        content: "Save your Prafund simulation and pick up your financial journey on any device.",
      },
    ],
  }),
  validateSearch: (search: { redirect?: string; mode?: string }) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    mode: search.mode === "signup" ? ("signup" as const) : undefined,
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const next = safePath(search.redirect);

  const [mode, setMode] = useState<Mode>(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: next, replace: true });
  }, [loading, user, next, navigate]);

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      sessionStorage.setItem("moneyquest.next", next);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("We couldn't start Google sign-in. Please try again.");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      void navigate({ to: next, replace: true });
    } catch {
      setError("We couldn't start Google sign-in. Please try again.");
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        setNotice("Password reset link sent. Check your inbox.");
      } else if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: username.trim() || email.split("@")[0] },
          },
        });
        if (err) throw err;
        if (!data.session) setCheckEmail(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setNotice(null);
    setError(null);
    const { error: err } = await supabase.auth.resend({ type: "signup", email });
    if (err) setError(err.message);
    else setNotice("Verification email sent again.");
  }

  if (checkEmail) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-md px-4 py-16">
          <div className="mq-card p-8 text-center">
            <Mail className="mx-auto size-8 text-info" aria-hidden />
            <h1 className="mt-4 font-display text-2xl font-bold">Check your email 📬</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a verification link to <span className="font-semibold">{email}</span>. Click it
              to activate your account, then come back and log in.
            </p>
            {notice && <p className="mt-4 text-sm text-gain">{notice}</p>}
            {error && <p className="mt-4 text-sm text-alert">{error}</p>}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={resend}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold"
              >
                Resend email
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("signup");
                }}
                className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
        <div className="mq-card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">
            {mode === "signup"
              ? "Create your account"
              : mode === "forgot"
                ? "Reset your password"
                : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "We'll email you a link to choose a new password."
              : "Your simulated financial journey is saved to your account."}
          </p>

          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-60"
              >
                <span aria-hidden className="text-base">
                  G
                </span>
                Continue with Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or continue with email
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="moneywise21"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown on leaderboards instead of your real name.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-alert">
                {error}
              </p>
            )}
            {notice && <p className="text-sm text-gain">{notice}</p>}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Log in"}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-sm">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-info"
                >
                  New here? Create an account
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-muted-foreground underline"
                >
                  Forgot your password?
                </button>
              </>
            )}
            {mode !== "signin" && (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-semibold text-info"
              >
                Back to log in
              </button>
            )}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Prafund never asks for bank, brokerage or card details. Everything in the app is
            simulated money. Need help?{" "}
            <Link to="/help" className="underline">
              Visit the help center
            </Link>
            .
          </p>
        </div>
      </div>
    </Shell>
  );
}
