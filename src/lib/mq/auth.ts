import { useEffect, useState } from "react";
import { currentUser, subscribe, type AuthUser } from "./localAuth";

export type { AuthUser };

/**
 * The signed-in player. Accounts are stored in this browser (see localAuth.ts),
 * so this resolves immediately instead of waiting on a network round trip.
 */
export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(() => currentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(currentUser());
    setLoading(false);
    return subscribe(() => setUser(currentUser()));
  }, []);

  return { user, loading };
}

/** Only allow same-origin relative paths as post-login destinations. */
export function safePath(value: string | undefined | null, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
