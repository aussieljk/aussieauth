/**
 * The fixture handlers, which now live in the package.
 *
 * They were written here and used only here, which is exactly why nobody
 * embedding the card could have them — they were never in `exports`. They're
 * shipped as `@aussieljk/auth/testing` now, and this file is the one line that
 * keeps every existing `@/testing/handlers` import working.
 */
export {
  appWithMethods,
  fixtureSession,
  handlers,
  mountHandlers,
  workingDeployment,
} from "@aussieljk/auth/testing";
