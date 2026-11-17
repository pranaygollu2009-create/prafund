/**
 * Supabase account backend.
 *
 * Used when a Supabase project is configured (see supabase.ts); otherwise the
 * app falls back to browser-local accounts in localAuth.ts. Email/password and
 * Google ID tokens are handled by Supabase auth, and the signed-in player's
 * simulation save lives in the `saves` table (see supabase/schema.sql).
 */
import { supabase } from "./supabase";
import type { AuthUser } from "./localAuth";

type SupaUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

const providerOf = (user: SupaUser): AuthUser["provider"] =>
  user.app_metadata?.["provider"] === "google" ? "google" : "password";

export function mapUser(user: SupaUser | null | undefined): AuthUser | null {
  if (!user?.email) return null;
  const meta = user.user_metadata ?? {};
  const name = meta["username"] ?? meta["name"] ?? meta["full_name"];
  const picture = meta["avatar_url"] ?? meta["picture"];
  return {
    id: user.id,
    email: user.email,
    username:
      (typeof name === "string" && name.trim()) || user.email.split("@")[0] || "player",
    provider: providerOf(user),
    createdAt: Date.parse(user.created_at ?? "") || Date.now(),
    ...(typeof picture === "string" && picture ? { picture } : {}),
  };
}

/** Human-readable message for the errors Supabase returns from auth. */
function friendly(error: { message: string; status?: number | undefined }): Error {
  const m = error.message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists"))
    return new Error("An account with that email already exists. Log in instead.");
  if (m.includes("invalid login credentials"))
    return new Error("That email and password don't match. Try again.");
  if (m.includes("email not confirmed"))
    return new Error("Confirm your email first — we sent you a link when you signed up.");
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return new Error("Google sign-in isn't enabled on this project yet. Use email for now.");
  if (m.includes("password should be at least"))
    return new Error("Choose a password with at least 6 characters.");
  if (m.includes("rate limit") || m.includes("too many"))
    return new Error("Too many attempts — wait a minute and try again.");
  return new Error(error.message || "That didn't work. Please try again.");
}

/** Restores the stored session and reports every later auth change. */
export async function initCloudAuth(onChange: (user: AuthUser | null) => void): Promise<void> {
  const { data } = await supabase.auth.getSession();
  onChange(mapUser(data.session?.user));
  supabase.auth.onAuthStateChange((_event, session) => onChange(mapUser(session?.user)));
}

export async function cloudSignUp(
  email: string,
  password: string,
  username: string,
): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { username: username.trim() || email.split("@")[0] || "player" } },
  });
  if (error) throw friendly(error);
  if (!data.session) {
    throw new Error("Check your inbox for the confirmation link, then log in.");
  }
  const user = mapUser(data.user);
  if (!user) throw new Error("Your account was created, but we couldn't read the session.");
  return user;
}

export async function cloudSignInPassword(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw friendly(error);
  const user = mapUser(data.user);
  if (!user) throw new Error("We couldn't read that session. Try again.");
  return user;
}

/** Completes sign-in from a Google Identity Services ID token. */
export async function cloudSignInGoogle(credential: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
  });
  if (error) throw friendly(error);
  const user = mapUser(data.user);
  if (!user) throw new Error("Google signed you in, but we couldn't read the session.");
  return user;
}

export async function cloudSetUsername(name: string): Promise<AuthUser | null> {
  const clean = name.trim();
  if (!clean) return null;
  const { data, error } = await supabase.auth.updateUser({ data: { username: clean } });
  if (error) throw friendly(error);
  return mapUser(data.user);
}

/**
 * Cloud "forgot password": with a recovery session open the new password is
 * applied immediately; otherwise Supabase emails a reset link instead.
 */
export async function cloudResetPassword(
  email: string,
  password: string,
): Promise<{ emailed: boolean; user?: AuthUser | null }> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const { data: updated, error } = await supabase.auth.updateUser({ password });
    if (error) throw friendly(error);
    return { emailed: false, user: mapUser(updated.user) };
  }
  const mail = email.trim().toLowerCase();
  if (!mail) throw new Error("Enter the email address on your account.");
  const base = (import.meta as unknown as { env: Record<string, string | undefined> }).env[
    "BASE_URL"
  ] ?? "/";
  const redirectTo = `${window.location.origin}${base.replace(/\/$/, "")}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo });
  if (error) throw friendly(error);
  return { emailed: true };
}

export async function cloudSignOut(): Promise<void> {
  await supabase.auth.signOut().catch(() => undefined);
}

/** Deletes the account and its saved progress (needs supabase/schema.sql). */
export async function cloudDeleteAccount(userId: string): Promise<void> {
  const db = supabase as unknown as {
    from: (table: string) => {
      delete: () => { eq: (column: string, value: string) => Promise<{ error: unknown }> };
    };
    rpc: (fn: string) => Promise<{ error: unknown }>;
  };
  await db.from("saves").delete().eq("user_id", userId);
  const { error } = await db.rpc("delete_own_account");
  if (error) {
    // Without the SQL helper we can still remove the player's data and session.
    console.warn("[auth] delete_own_account unavailable — removed save data only", error);
  }
  await cloudSignOut();
}
