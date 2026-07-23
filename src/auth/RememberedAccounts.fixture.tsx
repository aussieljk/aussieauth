import { REMEMBERED_ACCOUNTS } from "@/lib/storage";
import { MockApi } from "@/testing/MockApi";
import { RememberedAccounts } from "./RememberedAccounts";

/** Also read by `RememberedAccounts.test.tsx`, which needs a spy for the panel
 * callback and so builds its own element around the same seed. */
export const seed = (accounts: unknown[]) => ({
  [REMEMBERED_ACCOUNTS]: JSON.stringify(accounts),
});

/**
 * The usual case: a real address shows the address, and an account with only an
 * invented one (anonymous, account number) falls back to naming its method.
 */
export const twoAccounts = seed([
  {
    id: "user_1",
    name: "Lucas Knight",
    email: "lucas@example.com",
    method: "google",
    cookie: "{}",
    savedAt: 2,
  },
  {
    id: "user_2",
    name: "Anonymous",
    email: "abc@anonymous.invalid",
    method: "anonymous",
    savedAt: 1,
  },
]);

/**
 * An entry whose stored session has already been rejected keeps no cookie, so
 * clicking it hands the caller a panel to finish in rather than failing.
 */
export const sessionExpired = seed([
  {
    id: "user_1",
    name: "Lucas Knight",
    email: "lucas@example.com",
    method: "email-password",
    savedAt: 1,
  },
]);

const noop = () => {};

export default {
  /** Nothing to offer on a browser that's never signed in — the list stays out
   * of the card entirely rather than reserving an empty row. */
  "Never signed in": (
    <MockApi>
      <RememberedAccounts onNeedsPanel={noop} />
    </MockApi>
  ),
  "Two accounts": (
    <MockApi storage={twoAccounts}>
      <RememberedAccounts onNeedsPanel={noop} />
    </MockApi>
  ),
  "Session expired": (
    <MockApi storage={sessionExpired}>
      <RememberedAccounts onNeedsPanel={noop} />
    </MockApi>
  ),
};
