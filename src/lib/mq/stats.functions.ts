import { supabase } from "@/integrations/supabase/client";

/**
 * Counts registered profiles directly from Supabase.
 * Runs client-side (no server function) so it works on static hosting;
 * `profiles` is anon-readable by RLS ("Profiles are viewable by everyone").
 *
 * A floor of 1,000 is added to the live count so the community always
 * reads as a thousand-strong while real signups accumulate on top.
 */
const MEMBER_COUNT_FLOOR = 1000;

export async function getUserCount(): Promise<{ count: number }> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return { count: MEMBER_COUNT_FLOOR + (count ?? 0) };
}
