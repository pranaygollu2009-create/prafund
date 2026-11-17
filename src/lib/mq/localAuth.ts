/**
 * Accounts for Prafund.
 *
 * Two backends, chosen at runtime:
 *  - **cloud** — a Supabase project (see supabase/schema.sql). Real email and
 *    Google accounts plus cross-device saves; chosen when VITE_SUPABASE_URL and
 *    VITE_SUPABASE_PUBLISHABLE_KEY are set and the project answers.
 *  - **local** — accounts in this browser (salted SHA-256 in localStorage),
 *    used when no project is configured or it is unreachable, so sign-in never
 *    dead-ends. The simulation save is local in both modes.
 */
import type { GameState } from "./engine";
import { cloudAvailable, supabaseConfigured } from "./supabase";
import {
  cloudDeleteAccount,
  cloudResetPassword,
  cloudSetUsername,
  cloudSignInGoogle,
  cloudSignInPassword,
  cloudSignOut,
  cloudSignUp,
  initCloudAuth,
} from "./cloudAuth";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  provider: "google" | "password";
  picture?: string;
  createdAt: number;
};

/** `emailed: true` means a reset link was sent instead of the password being changed. */
export type PasswordResetResult = { emailed: boolean };

type StoredAccount = AuthUser & { salt?: string; passwordHash?: string };

const ACCOUNTS_KEY = "prafund.accounts.v1";
const SESSION_KEY = "prafund.session.v1";
const SAVE_KEY = "moneyquest.save.v1";

const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

/* ------------------------------------------------------------------ cloud -- */

let backend: "local" | "cloud" = "local";
let cloudUser: AuthUser | null = null;
let booting: Promise<void> | null = null;

/** Resolves once we know whether this page runs on cloud or local accounts. */
export function authReady(): Promise<void> {
  booting ??= boot();
  return booting;
}

async function boot() {
  if (!supabaseConfigured || !(await cloudAvailable())) return;
  try {
    await initCloudAuth((user) => {
      cloudUser = user;
      backend = "cloud";
      emit();
    });
    backend = "cloud";
  } catch {
    backend = "local";
  }
}

/** True when real accounts and cross-device saves are active. */
export async function isCloud(): Promise<boolean> {
  await authReady();
  return backend === "cloud";
}

/* ------------------------------------------------------------------ local -- */

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

/* ---------------------------------------------------------------- public --- */

/** The signed-in account, or null. Safe to call during SSR. */
export function currentUser(): AuthUser | null {
  if (backend === "cloud") return cloudUser;
  try {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const account = readAccounts()[id];
    return account ? publicUser(account) : null;
  } catch {
    return null;
  }
}

/** Looks up a browser-local account (cloud accounts come from the session). */
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
  if (backend === "cloud") {
    cloudUser = null;
    void cloudSignOut();
    emit();
    return;
  }
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
  if (await isCloud()) {
    const user = await cloudSignUp(email, password, username);
    cloudUser = user;
    emit();
    return user;
  }
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
  if (await isCloud()) {
    const user = await cloudSignInPassword(email, password);
    cloudUser = user;
    emit();
    return user;
  }
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
export async function signInWithGoogleCredential(credential: string): Promise<AuthUser> {
  if (await isCloud()) {
    const user = await cloudSignInGoogle(credential);
    cloudUser = user;
    emit();
    return user;
  }
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

export async function setUsername(name: string): Promise<AuthUser | null> {
  if (await isCloud()) {
    const user = await cloudSetUsername(name);
    if (user) {
      cloudUser = user;
      emit();
    }
    return user;
  }
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

/** Sets a new password, or emails a reset link when running on cloud accounts. */
export async function resetPasswordForEmail(
  email: string,
  password: string,
): Promise<PasswordResetResult> {
  if (await isCloud()) {
    const result = await cloudResetPassword(email, password);
    if (result.user) {
      cloudUser = result.user;
      emit();
    }
    return { emailed: result.emailed };
  }
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
  return { emailed: false };
}

/** Removes the signed-in account and this browser's simulated progress. */
export async function deleteCurrentAccount(): Promise<void> {
  if (await isCloud()) {
    const user = cloudUser;
    if (user) await cloudDeleteAccount(user.id);
    cloudUser = null;
  } else {
    const user = currentUser();
    if (user) {
      const accounts = readAccounts();
      delete accounts[user.id];
      writeAccounts(accounts);
    }
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
