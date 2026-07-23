import { useEffect } from "react";
import { authClient } from "./auth-client";
import { AUTH_COOKIE, AUTH_SESSION_DATA, REMEMBERED_ACCOUNTS } from "./storage";

/**
 * The account chooser you get on the way back in.
 *
 * Signing in stores two things per account: who you were, and the cookie jar
 * that proved it. Coming back, we put the jar back and ask the server whether
 * it still holds — if it does you're in with no prompt at all. If it's expired
 * we fall back to re-running whichever method you used last time, which for a
 * social provider is usually still a silent redirect.
 *
 * All of this is per-browser. The jar already lives in localStorage because
 * `crossDomainClient` puts it there; keeping a second copy under our own key
 * doesn't widen the blast radius, it just stops sign-out from erasing it.
 */

export type RememberedAccount = {
  /** Better Auth user id — the identity of the entry. */
  id: string;
  name: string;
  email: string;
  image?: string | null;
  /** Provider id from `lastLoginMethod`, e.g. "google" or "email". */
  method?: string | null;
  /** Serialised cookie jar. Absent once the session behind it is known dead. */
  cookie?: string;
  savedAt: number;
};

const MAX_REMEMBERED = 5;

const read = (): RememberedAccount[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(REMEMBERED_ACCOUNTS) ?? "[]",
    );
    return Array.isArray(parsed) ? (parsed as RememberedAccount[]) : [];
  } catch {
    return [];
  }
};

const write = (accounts: RememberedAccount[]) =>
  localStorage.setItem(
    REMEMBERED_ACCOUNTS,
    JSON.stringify(
      [...accounts]
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, MAX_REMEMBERED),
    ),
  );

export const listRemembered = read;

/** Drops the entry entirely. Does not touch the server-side session. */
export const dropRemembered = (id: string) =>
  write(read().filter((a) => a.id !== id));

/**
 * Records the account that's signed in right now, jar and all. Runs on every
 * session settle rather than only on first sign-in, so the stored jar keeps up
 * with a refreshed session token.
 *
 * Reads the user off the Better Auth session rather than a Convex query: the
 * session is what the stored jar has to match, and it's already in memory.
 */
export function useRememberSignedInAccount() {
  const { data } = authClient.useSession();
  const user = data?.user as
    | {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        lastLoginMethod?: string | null;
      }
    | undefined;

  useEffect(() => {
    if (!user) return;
    const cookie = localStorage.getItem(AUTH_COOKIE);
    if (!cookie) return;
    write([
      ...read().filter((a) => a.id !== user.id),
      {
        id: user.id,
        name: user.name ?? "",
        email: user.email ?? "",
        image: user.image,
        method: user.lastLoginMethod,
        cookie,
        savedAt: Date.now(),
      },
    ]);
  }, [user]);
}

/**
 * Clears the local session without telling the server to revoke it, so the
 * account stays instantly restorable. `authClient.signOut()` is the other
 * option, and is what `forgetRemembered` below uses.
 */
export function localSignOut() {
  localStorage.removeItem(AUTH_COOKIE);
  localStorage.removeItem(AUTH_SESSION_DATA);
  void authClient.updateSession();
}

/**
 * Puts a remembered jar back and checks it with the server. Returns false when
 * the session is gone, having stripped the dead jar so we don't retry it.
 */
export async function restoreRemembered(account: RememberedAccount) {
  if (!account.cookie) return false;

  const previous = localStorage.getItem(AUTH_COOKIE);
  localStorage.setItem(AUTH_COOKIE, account.cookie);

  const { data } = await authClient.getSession();
  if (data) {
    void authClient.updateSession();
    return true;
  }

  // Expired or revoked. Put back whatever was there and mark the entry as
  // needing a real sign-in.
  if (previous) localStorage.setItem(AUTH_COOKIE, previous);
  else localStorage.removeItem(AUTH_COOKIE);
  write(
    read().map((a) => (a.id === account.id ? { ...a, cookie: undefined } : a)),
  );
  return false;
}

/**
 * Removes the entry *and* revokes its session, by signing out under that jar.
 * Only safe from the signed-out screen, which is the only place it's offered.
 */
export async function forgetRemembered(account: RememberedAccount) {
  if (account.cookie) {
    const previous = localStorage.getItem(AUTH_COOKIE);
    localStorage.setItem(AUTH_COOKIE, account.cookie);
    try {
      await authClient.signOut();
    } catch {
      // A dead session is already what we wanted; drop it either way.
    }
    // signOut empties the jar, so restore rather than assume.
    if (previous) localStorage.setItem(AUTH_COOKIE, previous);
    else localStorage.removeItem(AUTH_COOKIE);
  }
  dropRemembered(account.id);
}
