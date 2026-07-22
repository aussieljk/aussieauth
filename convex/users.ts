import { query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * The signed-in user, or null. Kept out of auth.ts so the Better Auth
 * component's import graph doesn't drag in app-side function registration.
 */
export const current = query({
  args: {},
  handler: async (ctx) => authComponent.safeGetAuthUser(ctx),
});
