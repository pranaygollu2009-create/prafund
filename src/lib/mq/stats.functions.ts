import { supabase } from "@/integrations/supabase/client";

/**
 * Counts registered profiles directly from Supabase.
 * Runs client-side (no server function) so it works on static hosting;
 * `profiles` is anon-readable by RLS ("Profiles are viewable by everyone").
 */
export async function getUserCount(): Promise<{ count: number }> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return { count: count ?? 0 };
}
