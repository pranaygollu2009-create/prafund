import { useEffect, useRef, useState } from "react";
import {
  fetchLiveSnapshot,
  LIVE_QUOTES_URL,
  seedMarket,
  tickMarket,
  type MarketSnapshot,
} from "./market";

export type MarketSource = "live" | "simulated";

/** Live-feed poll period (Edge Function caches upstream for ~45s). */
const LIVE_POLL_MS = 30_000;
/** Consecutive live-poll failures before falling back to the simulation. */
const MAX_LIVE_FAILURES = 2;

/**
 * Market feed hook.
 *
 * When VITE_MARKET_QUOTES_URL is configured, seeds and polls real quotes
 * (via the Supabase Edge Function proxying Yahoo Finance). If the feed is
 * missing or fails, falls back to the local simulation — continuing from the
 * last real prices when possible. `source` tells the UI which is active so
 * simulated prices are never presented as real.
 */
export function useMarket(intervalMs = 1500) {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);
  const [live, setLive] = useState(true);
  const [source, setSource] = useState<MarketSource | null>(null);
  const failures = useRef(0);

  useEffect(() => {
    let cancelled = false;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setLive(false);
    }
    (async () => {
      if (LIVE_QUOTES_URL) {
        try {
          const s = await fetchLiveSnapshot();
          if (!cancelled) {
            setSnap(s);
            setSource("live");
            return;
          }
        } catch {
          // fall through to simulation
        }
      }
      if (!cancelled) {
        setSnap(seedMarket());
        setSource("simulated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!live || !source) return;
    const period = source === "live" ? Math.max(intervalMs, LIVE_POLL_MS) : intervalMs;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (source === "live") {
        fetchLiveSnapshot()
          .then((s) => {
            failures.current = 0;
            setSnap(s);
          })
          .catch(() => {
            failures.current += 1;
            if (failures.current >= MAX_LIVE_FAILURES) setSource("simulated");
          });
      } else {
        setSnap((s) => (s ? tickMarket(s) : s));
      }
    }, period);
    return () => {
      clearInterval(timer);
    };
  }, [live, source, intervalMs]);

  return { snap, live, setLive, source };
}
