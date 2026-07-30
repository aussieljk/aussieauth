import { useRef, useState } from "react";
import { useAuthBaseURL } from "./context";
import { diagnoseAussieAuthError, explainAussieAuthError } from "./errors";

/**
 * Better Auth resolves rather than throws, handing back `{ data, error }`, so
 * every panel needs the same three-line dance: clear, await, read `.error`.
 * This does it once and hands back the pending/error/notice a form renders.
 *
 * It is also the one place every sign-in failure in the card passes through,
 * which makes it the right place to translate them — see `errors.ts`. Doing it
 * here rather than per panel is what stops the fifteen panels from each having
 * their own idea of what "Failed to fetch" means.
 */
const errorMessage = (result: unknown) => {
  if (typeof result !== "object" || result === null || !("error" in result)) return null;
  const { error } = result as { error?: { message?: string | null } | null };
  if (!error) return null;
  return error.message || "Something went wrong";
};

export type RunnerOptions = {
  /**
   * The method this runner drives, when the caller knows it. Only used to make
   * the explanation name the method — "not email-password" rather than "not
   * that method" — so leaving it off costs precision, not correctness.
   */
  method?: string;
};

export function useRunner({ method }: RunnerOptions = {}) {
  const baseURL = useAuthBaseURL();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Which attempt is current, so a slow diagnosis can't overwrite a newer one. */
  const attempt = useRef(0);

  const fail = (raw: unknown, id: number) => {
    // Shown straight away from what's already known, so a failed click reads
    // as failed on the same frame. Asking the deployment who we are to it is
    // what turns "one of these two things went wrong" into naming the one that
    // did, and that answer replaces this one when it lands — usually within a
    // few hundred milliseconds, and cached from then on.
    setError(explainAussieAuthError(raw, { baseURL, method }));
    void diagnoseAussieAuthError(raw, { baseURL, method }).then((refined) => {
      // Not if the user has since started another attempt: that run cleared
      // the error, and putting this one back would explain a failure they've
      // already moved on from.
      if (attempt.current === id) setError(refined);
    });
  };

  const run = async (fn: () => Promise<unknown>, onSuccess?: string) => {
    const id = ++attempt.current;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const failure = errorMessage(await fn());
      if (failure) {
        fail(failure, id);
        return false;
      }
      if (onSuccess) setNotice(onSuccess);
      return true;
    } catch (e) {
      fail(e, id);
      return false;
    } finally {
      setPending(false);
    }
  };

  return { pending, error, notice, run };
}
