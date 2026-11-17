import { deleteCurrentAccount } from "./localAuth";

/** Permanently removes the signed-in account and this browser's saved progress. */
export async function deleteMyAccount(): Promise<{ ok: true }> {
  deleteCurrentAccount();
  return { ok: true };
}
