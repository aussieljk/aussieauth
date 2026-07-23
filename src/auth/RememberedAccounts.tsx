import { Avatar, Spinner, Typography } from "@aussieljk/frosted";
import { Icons } from "@aussieljk/frosted/icons";
import { useEffect, useRef, useState } from "react";
import { authClient, callbackURL } from "@/lib/auth-client";
import {
  checkRemembered,
  forgetRemembered,
  listRemembered,
  restoreRemembered,
  type RememberedAccount,
} from "@/lib/rememberedAccounts";
import { tryById } from "./providers";
import { Destructive, Feedback } from "./ui";

const { Text } = Typography;

/**
 * Re-runs the method an account used last time, for when its stored session
 * has expired. Social providers land back here without a second consent
 * screen; anything credential-shaped can't be replayed, so those hand back the
 * panel id for the caller to open with the address filled in.
 */
const replay = (account: RememberedAccount): (() => Promise<unknown>) | { panel: string } => {
  const method = account.method ?? "";
  switch (method) {
    case "google":
    case "github":
    case "apple":
      return () =>
        authClient.signIn.social({
          provider: method,
          callbackURL: callbackURL(),
        });
    case "google-one-tap":
      return () => authClient.oneTap();
    case "passkey":
      return () => authClient.signIn.passkey();
    case "demo":
      return () => authClient.signIn.demo();
    case "anonymous":
      return () => authClient.signIn.anonymous();
    default:
      // email-password, magic-link, email-otp, username, phone, account
      // number: all need something only the user can supply.
      return { panel: method || "email-password" };
  }
};

export function RememberedAccounts({
  onNeedsPanel,
}: {
  /** Open a panel, pre-filled with the account's address, as a fallback. */
  onNeedsPanel: (panel: string, prefill: string) => void;
}) {
  // Read synchronously: the list must be on screen in the first frame, or the
  // card grows a row under the cursor a moment after paint.
  const [accounts, setAccounts] = useState(listRemembered);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Ids whose stored session we've already confirmed is alive. A ref rather
  // than state because nothing on screen changes when the answer lands — the
  // only difference is how much work the next click has to do.
  const verified = useRef(new Set<string>());
  const top = accounts[0];

  useEffect(() => {
    // Only the top entry, which is the most recently used and so the one
    // almost always clicked. Checking the rest would mean juggling the cookie
    // jar between several accounts at once for a case that rarely comes up.
    if (!top?.cookie) return;
    let live = true;
    void checkRemembered(top).then((alive) => {
      if (!live) return;
      if (alive) verified.current.add(top.id);
      // A dead jar has just been stripped; re-read so the row stops offering a
      // one-click sign-in it can't deliver.
      else setAccounts(listRemembered);
    });
    return () => {
      live = false;
    };
  }, [top]);

  if (accounts.length === 0) return null;

  const signIn = async (account: RememberedAccount) => {
    setBusy(account.id);
    setError(null);
    try {
      const prechecked = verified.current.has(account.id);
      if (await restoreRemembered(account, { prechecked })) return;
      const next = replay(account);
      if (typeof next === "function") {
        await next();
        return;
      }
      onNeedsPanel(next.panel, account.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setAccounts(listRemembered);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {accounts.map((account) => (
        <div key={account.id} className="flex items-center gap-1">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void signIn(account)}
            className="flex flex-1 items-center gap-3 rounded-md border border-[var(--gray-a5)] px-3 py-2 text-left transition-colors hover:bg-[var(--gray-a3)] disabled:opacity-60"
          >
            <Avatar
              src={account.image ?? undefined}
              fallback={(account.name || account.email || "?").slice(0, 1).toUpperCase()}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <Text weight="medium" className="truncate">
                {account.name || account.email}
              </Text>
              <Text color="gray" className="truncate">
                {subtitle(account)}
              </Text>
            </span>
            {busy === account.id && <Spinner />}
          </button>
          <Destructive
            label={`Forget ${account.name || account.email}`}
            icon={Icons.Close}
            disabled={busy !== null}
            onClick={() => void forgetRemembered(account).then(() => setAccounts(listRemembered))}
          />
        </div>
      ))}
      <Feedback error={error} />
    </div>
  );
}

const subtitle = (account: RememberedAccount) => {
  const method = tryById(account.method)?.label;
  // The email is the more useful line when it's real; the invented ones
  // (`…@anonymous.invalid` and friends) say nothing the method doesn't.
  const email = account.email?.endsWith(".invalid") ? null : account.email;
  if (email && email !== account.name) return email;
  return method ? `via ${method}` : "";
};
