import { supabase } from "@/integrations/supabase/client";
import type { GameState } from "./engine";

export type Profile = {
  id: string;
  username: string;
  level: number;
  xp: number;
};

export function levelFor(xp: number) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, level, xp")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function saveProfile(userId: string, patch: Partial<Omit<Profile, "id">>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function loadCloudSave(userId: string): Promise<GameState | null> {
  const { data } = await supabase
    .from("game_saves")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.state as GameState | undefined) ?? null;
}

export async function writeCloudSave(userId: string, state: GameState) {
  await supabase.from("game_saves").upsert({ user_id: userId, state: state as never });
  await supabase
    .from("profiles")
    .update({ xp: state.xp, level: levelFor(state.xp) })
    .eq("id", userId);
}

export async function clearCloudSave(userId: string) {
  await supabase.from("game_saves").delete().eq("user_id", userId);
}
