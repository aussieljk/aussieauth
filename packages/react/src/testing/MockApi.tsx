import type { RequestHandler } from "msw";
import { setupWorker } from "msw/browser";
import { type ReactNode, useEffect, useState } from "react";
import { forgetAppRegistration } from "../appInfo";

/**
 * The browser a card renders into: which Better Auth endpoints answer, and
 * what's already in localStorage.
 *
 * Wrapping the subject rather than having a decorator do it is what keeps the
 * workbench and the tests that import the same fixtures from drifting apart —
 * whatever you see is what the test asserts on.
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
    // The `/apps/me` answer is cached per deployment for the life of the
    // module, which is right in an app and wrong here: two fixtures on one
    // page would otherwise share whichever registration mounted first, so a
    // "not registered" case would silently render the registered one.
    forgetAppRegistration();
  });

  // Nothing to intercept means nothing to wait for: the fixture renders on the
  // first frame and its requests fail the way they would against a deployment
  // that isn't there.
  const [ready, setReady] = useState(!handlers);
  const [failed, setFailed] = useState<Error | null>(null);

  useEffect(() => {
    if (!handlers) return;
    let live = true;
    booting ??= worker.start({ onUnhandledRequest: "bypass", quiet: true });
    void booting.then(
      () => {
        if (live) {
          worker.resetHandlers(...handlers);
          setReady(true);
        }
      },
      (error: unknown) => {
        // A worker that never starts used to leave `ready` false forever, so
        // the fixture rendered `null` — a blank frame with the reason only in
        // the console, and nothing saying which of the two it was.
        if (live) setFailed(error instanceof Error ? error : new Error(String(error)));
      },
    );
    return () => {
      live = false;
      worker.resetHandlers();
    };
  }, [handlers]);

  // Thrown during render rather than reported inline, so whatever error UI is
  // already around the fixture shows it — a workbench's boundary, a test's
  // failure — instead of a bespoke box only this component knows how to draw.
  if (failed) {
    throw new Error(
      `MockApi couldn't start MSW's service worker, so none of this fixture's ` +
        `endpoints are mocked: ${failed.message}\n\n` +
        `A service worker only registers in a document loaded from a real ` +
        `http(s) URL, and only when the worker script is served from one — so ` +
        `the two causes are a renderer using an about:blank frame, and a ` +
        `missing /mockServiceWorker.js. Run \`msw init <public dir>\` for the ` +
        `second.`,
    );
  }

  return ready ? children : null;
}
