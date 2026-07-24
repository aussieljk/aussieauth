import { Typography } from "@aussieljk/frosted";
import { authClient } from "@/lib/auth-client";
import { BigButton, Feedback } from "./ui";
import { useRunner } from "./useRunner";

const { Text } = Typography;

/**
 * Google One Tap — retired from the sign-in card on 2026-07-24 because it opens
 * a Google popup window, and Better Auth can't run it as a same-window redirect
 * (its One Tap uses a JS callback, which GSI's `ux_mode: "redirect"` ignores).
 * See [[one-tap-popup-inherent]].
 *
 * Nothing is torn down on the backend: the client `oneTapClient()` plugin and
 * the server `oneTap()` plugin are still registered, the `/one-tap/callback`
 * endpoint is live, and `providers.ts` still lists the `google-one-tap` row so
 * the landing grid keeps advertising it. This file just holds the two bits of
 * UI that were unwired from the card, so switching it back on is copy-paste
 * rather than reconstruction.
 *
 * To re-enable:
 *   1. methods.ts — add `"google-one-tap": OneTapPanel` back to PANELS,
 *      importing OneTapPanel from here.
 *   2. SignIn.tsx — re-add the import `GOOGLE_CLIENT_ID` from "@/lib/auth-client"
 *      and `OneTapButton` from here, then restore:
 *        const oneTapOffered =
 *          Boolean(GOOGLE_CLIENT_ID) &&
 *          offered.some((p) => p.id === "google-one-tap") &&
 *          !needsSetup("google");
 *      and render `{oneTapOffered && <OneTapButton />}` under the social buttons.
 *   3. RememberedAccounts.tsx — point the `google-one-tap` replay case back at
 *      `() => authClient.oneTap()` instead of the Google redirect.
 *
 * It is deliberately imported nowhere. It stays in the build so it keeps
 * type-checking against the live auth client and can't silently rot.
 */

/** The standalone One Tap button that used to sit under the social buttons. */
export function OneTapButton() {
  const { pending, error, run } = useRunner();
  return (
    <div className="flex flex-col gap-2">
      <BigButton pending={pending} onClick={() => void run(() => authClient.oneTap())}>
        One Tap sign-in
      </BigButton>
      <Feedback error={error} />
    </div>
  );
}

/** The inline panel reached by opening the Google One Tap method. */
export function OneTapPanel() {
  const { pending, error, run } = useRunner();
  return (
    <div className="flex flex-col gap-3">
      <Text color="gray">Silent sign-in from an existing Google session</Text>
      <BigButton pending={pending} onClick={() => void run(() => authClient.oneTap())}>
        One Tap sign-in
      </BigButton>
      <Feedback error={error} />
    </div>
  );
}
