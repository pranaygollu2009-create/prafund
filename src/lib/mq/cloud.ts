/**
 * Profile + save helpers.
 *
 * With a Supabase project configured, the signed-in player's save is mirrored to
 * the `saves` table (supabase/schema.sql) so progress follows them between
 * devices; without one, localStorage (`moneyquest.save.v1`) is the only copy.
 */
import type { GameState } from "./engine";
import { accountById, currentUser, isCloud, setUsername } from "./localAuth";
import { supabase } from "./supabase";

export type Profile = {
  id: string;
  username: string;
  level: number;
  xp: number;
};

type SaveTable = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => { maybeSingle: () => Promise<{ data: { state?: unknown } | null; error: unknown }> };
    };
    upsert: (row: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{ error: unknown }>;
    delete: () => { eq: (column: string, value: string) => Promise<{ error: unknown }> };
  };
};

const saveTable = () => supabase as unknown as SaveTable;

export function levelFor(xp: number) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  if (await isCloud()) {
    const user = currentUser();
    if (!user || user.id !== userId) return null;
    return { id: user.id, username: user.username, level: 1, xp: 0 };
  }
  const account = accountById(userId);
  if (!account) return null;
  return { id: account.id, username: account.username, level: 1, xp: 0 };
}

export async function saveProfile(userId: string, patch: Partial<Omit<Profile, "id">>) {
  if (await isCloud()) {
    if (patch.username !== undefined) await setUsername(patch.username);
    return;
  }
  const account = accountById(userId);
  if (!account) throw new Error("You're not signed in on this device.");
  if (patch.username !== undefined) await setUsername(patch.username);
}

/** The player's save from another device, or null when there is none. */
export async function loadCloudSave(userId: string): Promise<GameState | null> {
  if (!(await isCloud())) return null;
  const { data, error } = await saveTable()
    .from("saves")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const state = (data?.state ?? null) as GameState | null;
  if (!state || typeof state !== "object") return null;
  state.challengesDone ??= [];
  return state;
}

export async function writeCloudSave(userId: string, state: GameState): Promise<void> {
  if (!(await isCloud())) return;
  const { error } = await saveTable()
    .from("saves")
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, {
      onConflict: "user_id",
    });
  if (error) throw error;
}

export async function clearCloudSave(userId: string): Promise<void> {
  if (!(await isCloud())) return;
  const { error } = await saveTable().from("saves").delete().eq("user_id", userId);
  if (error) throw error;
}
