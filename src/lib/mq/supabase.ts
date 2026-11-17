/**
 * Supabase configuration probe.
 *
 * The app works with browser-local accounts when no project is configured (or
 * when the configured project cannot be reached), and switches to real cloud
 * accounts + cross-device saves when it can. Checking `/auth/v1/health` once
 * per page load keeps a dead or half-configured project from turning into a
 * network-error storm.
 */
import { supabase } from "@/integrations/supabase/client";

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

export const SUPABASE_URL = (env["VITE_SUPABASE_URL"] ?? "").trim();
export const SUPABASE_KEY = (env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "").trim();
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

let availability: Promise<boolean> | null = null;

/** True when a Supabase project is configured *and* answering right now. */
export function cloudAvailable(): Promise<boolean> {
  if (!supabaseConfigured || typeof window === "undefined") return Promise.resolve(false);
  availability ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        signal: controller.signal,
        headers: { apikey: SUPABASE_KEY },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  })();
  return availability;
}

export { supabase };
