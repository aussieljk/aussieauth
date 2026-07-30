import { REMEMBERED_ACCOUNTS, SignIn } from "@aussieljk/auth";
import { appWithMethods, handlers, mountHandlers } from "@/testing/handlers";
import { MockApi } from "@/testing/MockApi";

/**
 * The package's card, exercised the way an embedding app sees it. The app only
 * renders `<SignIn>` on the sign-in route, so these fixtures are where the
 * card's own paths — a rejected password, the two-factor challenge, the
 * account chooser, the states the registry puts it in — stay covered now that
 * the card lives in `packages/react`.
 *
 * `mountHandlers.appRegistered` rides along with the flow handlers because the
 * card asks `/apps/me` before it draws anything. Without it the fixture is
 * still correct — an unanswerable probe fails open — but it makes a real
 * network call on every mount, which is a red line in the console and a slower
 * test for no information.
 */
export default {
  "Wrong password": (
    <MockApi handlers={[...mountHandlers.appRegistered, ...handlers.signInFailure]}>
      <SignIn />
    </MockApi>
  ),
  "Two-factor challenge": (
    <MockApi handlers={[...mountHandlers.appRegistered, ...handlers.signInTotp]}>
      <SignIn />
    </MockApi>
  ),
  /**
   * A remembered account whose stored session is gone (no cookie), for a
   * method that can't be replayed silently — clicking it must fall back to the
   * password panel with the address already filled in.
   */
  "Remembered account": (
    <MockApi
      storage={{
        [REMEMBERED_ACCOUNTS]: JSON.stringify([
          {
            id: "user_fixture",
            name: "Lucas",
            email: "lucas@example.com",
            method: "email-password",
            savedAt: 1,
          },
        ]),
      }}
    >
      <SignIn />
    </MockApi>
  ),
  /**
   * The app registered two methods, so the other thirteen are buttons that
   * would only ever come back 403. They shouldn't be drawn.
   */
  "Method allow-list": (
    <MockApi handlers={appWithMethods(["google", "email-password"])}>
      <SignIn />
    </MockApi>
  ),
  /**
   * Nothing on this card can work, and the card says so before anyone clicks —
   * a blocked request has no response body to explain itself afterwards.
   */
  "Unregistered origin": (
    <MockApi handlers={mountHandlers.appUnregistered}>
      <SignIn />
    </MockApi>
  ),
};
