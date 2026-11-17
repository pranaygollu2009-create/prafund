/**
 * Browser-local accounts for Prafund.
 *
 * The Supabase project that used to hold sign-in and cloud saves no longer
 * exists, so accounts and sessions now live in this browser — which matches
 * the rest of the app: the whole simulation is local
 * (`moneyquest.save.v1`) and none of it is real money.
 *
 * Google sign-in still verifies with Google itself (Identity Services in
 * routes/auth.tsx hands us a signed ID token); we only keep the resulting
 * profile here instead of in a remote database.
 */
import type { GameState } from "./engine";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  provider: "google" | "password";
  picture?: string;
  createdAt: number;
};

type StoredAccount = AuthUser & { salt?: string; passwordHash?: string };

const ACCOUNTS_KEY = "prafund.accounts.v1";
const SESSION_KEY = "prafund.session.v1";
const SAVE_KEY = "moneyquest.save.v1";

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function readAccounts(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, StoredAccount>) : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, StoredAccount>) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* storage unavailable */
  }
}

/** Strips the password material before anything outside this module sees an account. */
function publicUser(account: StoredAccount): AuthUser {
  return {
    id: account.id,
    email: account.email,
    username: account.username,
    provider: account.provider,
    createdAt: account.createdAt,
    ...(account.picture ? { picture: account.picture } : {}),
  };
}

/**
 * SHA-256 where available. Over plain http (e.g. a LAN dev address) `crypto.subtle`
 * is missing, so fall back to a djb2 digest — these are throwaway local accounts,
 * and the hash only has to stop someone reading the password out of localStorage.
 */
async function digest(text: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(`prafund:${text}`);
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
    return `djb2-${h.toString(16)}`;
  }
}

function randomSalt(): string {
  const bytes = new Uint8Array(8);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function startSession(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* storage unavailable */
  }
  emit();
}

/** The signed-in account, or null. Safe to call during SSR. */
export function currentUser(): AuthUser | null {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const account = readAccounts()[id];
    return account ? publicUser(account) : null;
  } catch {
    return null;
  }
}

export function accountById(id: string): AuthUser | null {
  const account = readAccounts()[id];
  return account ? publicUser(account) : null;
}

/** Notifies subscribers whenever the session or the signed-in account changes. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
  emit();
}

export async function signUpWithPassword(
  email: string,
  password: string,
  username: string,
): Promise<AuthUser> {
  const mail = email.trim().toLowerCase();
  const accounts = readAccounts();
  if (Object.values(accounts).some((a) => a.email === mail)) {
    throw new Error("An account with that email already exists here. Try logging in instead.");
  }
  const salt = randomSalt();
  const id = `u_${(await digest(`${mail}|${salt}`)).slice(0, 16)}`;
  const account: StoredAccount = {
    id,
    email: mail,
    username: username.trim() || mail.split("@")[0] || "player",
    provider: "password",
    createdAt: Date.now(),
    salt,
    passwordHash: await digest(`${salt}|${password}`),
  };
  accounts[id] = account;
  writeAccounts(accounts);
  startSession(id);
  return publicUser(account);
}

export async function signInWithPassword(email: string, password: string): Promise<AuthUser> {
  const mail = email.trim().toLowerCase();
  const account = Object.values(readAccounts()).find((a) => a.email === mail);
  if (!account) {
    throw new Error("No account for that email in this browser. Create one — it takes a second.");
  }
  if (!account.salt || !account.passwordHash) {
    throw new Error("That account was created with Google. Use Continue with Google.");
  }
  if ((await digest(`${account.salt}|${password}`)) !== account.passwordHash) {
    throw new Error("That password doesn't match. Try again.");
  }
  startSession(account.id);
  return publicUser(account);
}

/** Decodes the payload of a Google ID token (JWT) without verifying it — Google's own script issued it to us. */
function decodeIdToken(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("Google returned an unexpected credential.");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object") throw new Error("Google returned an unexpected credential.");
  return parsed as Record<string, unknown>;
}

/** Completes sign-in from a Google Identity Services ID token. */
export function signInWithGoogleCredential(credential: string): AuthUser {
  const payload = decodeIdToken(credential);
  const email = String(payload["email"] ?? "").trim().toLowerCase();
  if (!email) throw new Error("Google didn't return an email address.");
  const accounts = readAccounts();
  const existing = Object.values(accounts).find((a) => a.email === email);
  if (existing) {
    startSession(existing.id);
    return publicUser(existing);
  }
  const sub = String(payload["sub"] ?? email);
  const id = `g_${sub.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}`;
  const name = String(payload["name"] ?? payload["given_name"] ?? email.split("@")[0] ?? "player");
  const picture = typeof payload["picture"] === "string" ? payload["picture"] : undefined;
  const account: StoredAccount = {
    id,
    email,
    username: name,
    provider: "google",
    createdAt: Date.now(),
    ...(picture ? { picture } : {}),
  };
  accounts[id] = account;
  writeAccounts(accounts);
  startSession(id);
  return publicUser(account);
}

export function setUsername(name: string): AuthUser | null {
  const user = currentUser();
  if (!user) return null;
  const accounts = readAccounts();
  const account = accounts[user.id];
  if (!account) return null;
  account.username = name.trim() || account.username;
  writeAccounts(accounts);
  emit();
  return publicUser(account);
}

/** Sets a new password for a local email account (the "forgot password" path). */
export async function resetPasswordForEmail(email: string, password: string): Promise<AuthUser> {
  const mail = email.trim().toLowerCase();
  const accounts = readAccounts();
  const account = Object.values(accounts).find((a) => a.email === mail);
  if (!account) {
    throw new Error("No account for that email in this browser. Create one instead.");
  }
  if (account.provider === "google" && !account.passwordHash) {
    throw new Error("That account signs in with Google — use Continue with Google.");
  }
  account.salt = randomSalt();
  account.passwordHash = await digest(`${account.salt}|${password}`);
  writeAccounts(accounts);
  startSession(account.id);
  return publicUser(account);
}

/** Removes the signed-in account and this browser's simulated progress. */
export function deleteCurrentAccount() {
  const user = currentUser();
  if (user) {
    const accounts = readAccounts();
    delete accounts[user.id];
    writeAccounts(accounts);
  }
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
  emit();
}

export type { GameState };
