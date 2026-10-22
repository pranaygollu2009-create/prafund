import type { Review } from "./seed-reviews";

/**
 * Community reviews wall storage.
 *
 * Review posts go to the Prafund public reviews API (small Workers + D1
 * service under the project's own Freebuff hosting) so any visitor's review
 * shows up for everyone on the wall. The API returns a one-time delete token
 * for each post made from this browser, stored locally so the poster can
 * remove their own review later. When the API is unreachable, reviews still
 * save on this device (marked "this device only") like the pre-API build.
 */

export const REVIEWS_API = "https://site-cbdd83d396b94426930c13c78aa7c323.freebuff.page/reviews";

const LOCAL_KEY = "prafund.reviews.local.v1";
const TOKENS_KEY = "prafund.reviews.tokens.v1";

export function loadLocal(): Review[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

export function saveLocal(next: Review[]) {
  try {
    if (next.length === 0) localStorage.removeItem(LOCAL_KEY);
    else localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

function readTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function rememberToken(id: string, token: string) {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...readTokens(), [id]: token }));
  } catch {
    /* storage unavailable */
  }
}

function forgetToken(id: string) {
  const next = { ...readTokens() };
  delete next[id];
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

/** True when this browser holds the delete token for a wall review. */
export function canDeleteWallReview(id: string): boolean {
  return Boolean(readTokens()[id]);
}

export type CommunityResult = {
  rows: Review[];
  available: boolean;
};

export async function listCommunity(): Promise<CommunityResult> {
  try {
    const res = await fetch(REVIEWS_API, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      rows: { id: string; name: string; rating: number; body: string; created_at: string }[];
    };
    return {
      available: true,
      rows: (data.rows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        body: r.body,
        at: r.created_at,
        kind: "wall" as const,
      })),
    };
  } catch {
    return { rows: [], available: false };
  }
}

export type PostInput = { name: string; rating: number; body: string };
export type PostResult = { ok: true; review: Review } | { ok: false; error: string };

export async function postReview(input: PostInput): Promise<PostResult> {
  try {
    const res = await fetch(REVIEWS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input.name, rating: input.rating, body: input.body }),
    });
    const payload = (await res.json()) as {
      review?: { id: string; name: string; rating: number; body: string; created_at: string };
      delete_token?: string;
      error?: string;
    };
    if (!res.ok || !payload.review) {
      return { ok: false, error: payload.error ?? `HTTP ${res.status}` };
    }
    if (payload.delete_token) rememberToken(payload.review.id, payload.delete_token);
    return {
      ok: true,
      review: {
        id: payload.review.id,
        name: payload.review.name,
        rating: payload.review.rating,
        body: payload.review.body,
        at: payload.review.created_at,
        kind: "wall",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Insert failed" };
  }
}

export async function removeOwnReview(id: string): Promise<boolean> {
  const token = readTokens()[id];
  if (!token) return false;
  try {
    const res = await fetch(`${REVIEWS_API}?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
    if (!res.ok) return false;
    forgetToken(id);
    return true;
  } catch {
    return false;
  }
}
