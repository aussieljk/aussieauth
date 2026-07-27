import { REMEMBERED_ACCOUNTS, SignIn } from "@aussieljk/auth";
import { handlers } from "@/testing/handlers";
import { MockApi } from "@/testing/MockApi";

/**
 * The package's card, exercised the way an embedding app sees it. The app only
 * renders `<SignIn>` on the sign-in route, so these fixtures are where the
 * card's own paths — a rejected password, the two-factor challenge, the
 * account chooser — stay covered now that the card lives in `packages/react`.
 */
export default {
  "Wrong password": (
    <MockApi handlers={handlers.signInFailure}>
      <SignIn />
    </MockApi>
  ),
  "Two-factor challenge": (
    <MockApi handlers={handlers.signInTotp}>
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
};
