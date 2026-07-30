/**
 * `@aussieljk/auth/testing` — the card, with no deployment behind it.
 *
 * ```tsx
 * import { AussieAuthSignIn } from "@aussieljk/auth";
 * import { MockApi, workingDeployment } from "@aussieljk/auth/testing";
 *
 * export default (
 *   <MockApi handlers={workingDeployment}>
 *     <AussieAuthSignIn appName="My App" />
 *   </MockApi>
 * );
 * ```
 *
 * `msw` is an optional peer dependency: nothing here is reachable from the
 * package's other entry points, so an app that never imports this subpath
 * never needs it installed.
 */
export {
  appWithMethods,
  fixtureSession,
  handlers,
  mountHandlers,
  workingDeployment,
} from "./handlers";
export { MockApi } from "./MockApi";
