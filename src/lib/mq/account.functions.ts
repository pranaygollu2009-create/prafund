import { deleteCurrentAccount } from "./localAuth";

/** Permanently removes the signed-in account and its saved progress. */
export async function deleteMyAccount(): Promise<{ ok: true }> {
  await deleteCurrentAccount();
  return { ok: true };
}
