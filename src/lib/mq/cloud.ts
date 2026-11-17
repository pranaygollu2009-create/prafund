/**
 * Profile + save helpers.
 *
 * Accounts live in this browser (see localAuth.ts) and the simulation save is
 * already kept in localStorage (`moneyquest.save.v1`), so there is no remote
 * database any more. These functions keep their old call signatures so the
 * profile page and the game store work unchanged.
 */
import type { GameState } from "./engine";
import { accountById, setUsername } from "./localAuth";

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
  const account = accountById(userId);
  if (!account) return null;
  return { id: account.id, username: account.username, level: 1, xp: 0 };
}

export async function saveProfile(userId: string, patch: Partial<Omit<Profile, "id">>) {
  const account = accountById(userId);
  if (!account) throw new Error("You're not signed in on this device.");
  if (patch.username !== undefined) setUsername(patch.username);
}

/** No cloud anymore: the save in localStorage is the source of truth. */
export async function loadCloudSave(_userId: string): Promise<GameState | null> {
  return null;
}

export async function writeCloudSave(_userId: string, _state: GameState): Promise<void> {
  /* local save only */
}

export async function clearCloudSave(_userId: string): Promise<void> {
  /* local save only */
}
