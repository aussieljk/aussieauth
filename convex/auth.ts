import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx, type MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // The default Password profile only keeps email; we also collect a name
    // on sign-up so there's something to show for the signed-in user.
    Password({
      profile: (params) => ({
        email: params.email as string,
        name: (params.name as string) || (params.email as string),
      }),
    }),
  ],
});

// Use this in your own queries/mutations to scope data to the signed-in user.
// Store the returned `Id<"users">` on your documents — never `tokenIdentifier`,
// which includes the session id and so changes on every sign-in.
export async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return userId ? await ctx.db.get("users", userId) : null;
  },
});
