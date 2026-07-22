import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";

export default defineSchema({
  // users, authSessions, authAccounts, and friends. Owned by Convex Auth —
  // add your own tables alongside them.
  ...authTables,
});
