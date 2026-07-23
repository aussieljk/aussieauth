import { PENDING_ACCOUNT_NUMBER } from "@/lib/storage";
import { handlers } from "@/testing/handlers";
import { MockApi } from "@/testing/MockApi";
import { Account } from "./Account";

export default {
  /**
   * Passkeys and agent keys are plain fetches, not Convex subscriptions.
   * Passkeys arrive already named by the authenticator; keys are numbered, and
   * the create button always offers the next free number.
   */
  Loaded: (
    <MockApi handlers={handlers.account}>
      <Account />
    </MockApi>
  ),
  /**
   * Straight after an account-number sign-up. This is the only time the number
   * is ever shown — nothing on the server can produce it again.
   */
  "Fresh account number": (
    <MockApi handlers={handlers.account} storage={{ [PENDING_ACCOUNT_NUMBER]: "1234567890123456" }}>
      <Account />
    </MockApi>
  ),
};
