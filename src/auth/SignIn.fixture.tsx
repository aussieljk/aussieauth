import { MockApi } from "@/testing/MockApi";
import { SignIn } from "./SignIn";

/**
 * There's no handler for `/aussieauth/status` here, so the setup probe fails
 * and the card renders its unknown-status state: every method offered, no setup
 * warnings. Same thing a real deployment shows before the probe lands.
 */
export default (
  <MockApi>
    <SignIn />
  </MockApi>
);
