import { supabase } from "@/integrations/supabase/client";
import type { Review } from "./seed-reviews";

/**
 * Community reviews wall storage.
 *
 * Real posts live in the Supabase `reviews` table (anon-writable, RLS-guarded),
 * so a review posted by any visitor shows up for everyone. When Supabase is
 * unavailable (demo/static build without keys) the page still works with its
 * seeded reviews and device-local posts; the helpers below just degrade.
 */

const LOCAL_KEY = "prafund.reviews.local.v1";

export type Line = Review;

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

export type CommunityResult = {
  rows: Review[];
  available: boolean;
};

export async function listCommunity(): Promise<CommunityResult> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, name, rating, body, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return {
      available: true,
      rows: (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        rating: r.rating,
        body: r.body,
        kind: "wall",
        at: r.created_at,
        userId: r.user_id,
      })) as Review[],
    };
  } catch {
    return { rows: [], available: false };
  }
}

export type PostInput = { name: string; rating: number; body: string; userId: string | null };
export type PostResult = { ok: true; review: Review } | { ok: false; error: string };

export async function postReview(input: PostInput): Promise<PostResult> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .insert({ name: input.name, rating: input.rating, body: input.body, user_id: input.userId })
      .select("id, name, rating, body, created_at")
      .single();
    if (error) throw error;
    return {
      ok: true,
      review: {
        id: data.id,
        name: data.name,
        rating: data.rating,
        body: data.body,
        at: data.created_at,
        kind: "wall",
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Insert failed" };
  }
}

export async function removeOwnReview(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Live updates: subscribe to the `reviews` Postgres stream so new posts by
 * any visitor appear without a reload. Returns an unsubscribe that is safe
 * to call even when realtime/Supabase are unavailable.
 */
export function subscribeToReviews(onChange: () => void): () => void {
  try {
    const channel = supabase
      .channel("reviews-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        () => onChange(),
      )
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    };
  } catch {
    return () => {};
  }
}
