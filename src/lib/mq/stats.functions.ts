/**
 * Community member count shown on /users.
 *
 * Accounts are local now (no user table to count), so this is the published
 * membership number for the community page.
 */
const MEMBER_COUNT = 3694;

export async function getUserCount(): Promise<{ count: number }> {
  return { count: MEMBER_COUNT };
}
