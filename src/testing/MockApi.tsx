import type { RequestHandler } from "msw";
import { setupWorker } from "msw/browser";
import { type ReactNode, useEffect, useState } from "react";

/**
 * The browser a fixture renders into: which Better Auth endpoints answer, and
 * what's already in localStorage. Fixtures wrap themselves in this rather than
 * the decorator doing it, so the Cosmos UI and the tests that import those same
 * fixtures can't drift apart.
 */

const worker = setupWorker();
let booting: Promise<unknown> | null = null;

export function MockApi({
  handlers,
  storage,
  children,
}: {
  handlers?: RequestHandler[];
  storage?: Record<string, string>;
  children: ReactNode;
}) {
  // Seeded in a state initialiser rather than an effect: `RememberedAccounts`
  // and the account-number reveal read localStorage while computing their first
  // state, which happens before any effect runs.
  useState(() => {
    localStorage.clear();
    for (const [key, value] of Object.entries(storage ?? {})) {
      localStorage.setItem(key, value);
    }
  });

  // Nothing to intercept means nothing to wait for: the fixture renders on the
  // first frame and its requests fail the way they would against a deployment
  // that isn't there.
  const [ready, setReady] = useState(!handlers);
  useEffect(() => {
    if (!handlers) return;
    let live = true;
    booting ??= worker.start({ onUnhandledRequest: "bypass", quiet: true });
    void booting.then(() => {
      if (live) {
        worker.resetHandlers(...handlers);
        setReady(true);
      }
    });
    return () => {
      live = false;
      worker.resetHandlers();
    };
  }, [handlers]);

  return ready ? children : null;
}
