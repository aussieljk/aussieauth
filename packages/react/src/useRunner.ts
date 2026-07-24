import { useState } from "react";

/**
 * Better Auth resolves rather than throws, handing back `{ data, error }`, so
 * every panel needs the same three-line dance: clear, await, read `.error`.
 * This does it once and hands back the pending/error/notice a form renders.
 */
const errorMessage = (result: unknown) => {
  if (typeof result !== "object" || result === null || !("error" in result)) return null;
  const { error } = result as { error?: { message?: string | null } | null };
  if (!error) return null;
  return error.message || "Something went wrong";
};

export function useRunner() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, onSuccess?: string) => {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const failure = errorMessage(await fn());
      if (failure) {
        setError(failure);
        return false;
      }
      if (onSuccess) setNotice(onSuccess);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setPending(false);
    }
  };

  return { pending, error, notice, run };
}
