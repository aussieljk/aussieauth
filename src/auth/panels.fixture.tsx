import { handlers } from "@/testing/handlers";
import { MockApi } from "@/testing/MockApi";
import {
  AccountNumberPanel,
  EmailOtpPanel,
  EmailPasswordPanel,
  MagicLinkPanel,
} from "./panels";

export default {
  "Email + password": (
    <MockApi handlers={handlers.signInSuccess}>
      <EmailPasswordPanel />
    </MockApi>
  ),
  /** The failure path every panel shares: Better Auth resolves, `Feedback` shows. */
  "Email + password / rejected": (
    <MockApi handlers={handlers.signInFailure}>
      <EmailPasswordPanel />
    </MockApi>
  ),
  "Magic link": (
    <MockApi handlers={handlers.magicLink}>
      <MagicLinkPanel />
    </MockApi>
  ),
  "Email OTP": (
    <MockApi handlers={handlers.emailOtp}>
      <EmailOtpPanel />
    </MockApi>
  ),
  /** Sign-up signs you straight in, so the number is parked in localStorage for
   * the account page to reveal once. */
  "Account number": (
    <MockApi handlers={handlers.accountNumber}>
      <AccountNumberPanel />
    </MockApi>
  ),
};
