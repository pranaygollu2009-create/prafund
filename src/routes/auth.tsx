import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/mq/Shell";
import { safePath, useSession } from "@/lib/mq/auth";
import {
  resetPasswordForEmail,
  signInWithGoogleCredential,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/mq/localAuth";

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

/**
 * Google OAuth client ID (Google Cloud Console → Credentials → OAuth client ID,
 * type "Web application", with https://pranaygollu2009-create.github.io in the
 * authorised JavaScript origins). Baked in at build time.
 */
const GOOGLE_CLIENT_ID =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env[
    "VITE_GOOGLE_CLIENT_ID"
  ]?.trim() ?? "";

type GisId = {
  initialize: (options: Record<string, unknown>) => void;
  prompt: () => void;
};

/** Loads Google Identity Services once, on demand. */
function loadGoogleIdentity(): Promise<GisId> {
  return new Promise((resolve, reject) => {
    const existing = (window as unknown as { google?: { accounts?: { id?: GisId } } }).google
      ?.accounts?.id;
    if (existing) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const id = (window as unknown as { google?: { accounts?: { id?: GisId } } }).google?.accounts
        ?.id;
      if (id) resolve(id);
      else reject(new Error("Google Identity Services did not initialise."));
    };
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
}

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
  const googleReady = useRef(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: next, replace: true });
  }, [loading, user, next, navigate]);

  async function handleGoogle() {
    setError(null);
    setNotice(null);
    if (!GOOGLE_CLIENT_ID) {
      setError(
        "Google sign-in isn't set up for this deployment yet (no Google OAuth client ID). Use email instead — or add VITE_GOOGLE_CLIENT_ID and redeploy.",
      );
      return;
    }
    setBusy(true);
    try {
      const id = await loadGoogleIdentity();
      if (!googleReady.current) {
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: (response: { credential?: string }) => {
            try {
              if (!response?.credential) throw new Error("Google didn't return a credential.");
              signInWithGoogleCredential(response.credential);
            } catch (err) {
              setError(err instanceof Error ? err.message : "We couldn't finish Google sign-in.");
              setBusy(false);
            }
          },
        });
        googleReady.current = true;
      }
      id.prompt();
      // One Tap can close silently; never leave the button spinning forever.
      window.setTimeout(() => setBusy(false), 20_000);
    } catch (err) {
      setError(
        err instanceof Error
          ? `We couldn't reach Google: ${err.message}`
          : "We couldn't reach Google. Check your connection and try again.",
      );
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
        if (password.length < 6) throw new Error("Choose a password with at least 6 characters.");
        await resetPasswordForEmail(email, password);
        setNotice("Password updated. Taking you in…");
      } else if (mode === "signup") {
        await signUpWithPassword(email, password, username);
      } else {
        await signInWithPassword(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
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
              ? "Choose a new password for the account on this device."
              : "Your simulated financial journey is saved with your account."}
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
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                {mode === "forgot" ? "New password" : "Password"}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
                  ? "Set new password"
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
            Accounts for this app are stored in your browser — nothing is sent to a server. Prafund
            never asks for bank, brokerage or card details. Need help?{" "}
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
