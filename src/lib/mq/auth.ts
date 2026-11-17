import { useEffect, useState } from "react";
import { authReady, currentUser, subscribe, type AuthUser } from "./localAuth";

export type { AuthUser };

/**
 * The signed-in player. Resolves as soon as the account backend is known —
 * instantly for browser-local accounts, after one session check for cloud ones.
 */
export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(() => currentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const unsubscribe = subscribe(() => setUser(currentUser()));
    void authReady().then(() => {
      if (!alive) return;
      setUser(currentUser());
      setLoading(false);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}

/** Only allow same-origin relative paths as post-login destinations. */
export function safePath(value: string | undefined | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
