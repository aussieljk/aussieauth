import { useConvexAuth } from "convex/react";
import { Theme } from "@aussieljk/frosted";
import { Account } from "./account/Account";
import { SignIn } from "./auth/SignIn";
import { useRememberSignedInAccount } from "./lib/rememberedAccounts";

export default function App() {
  // `useConvexAuth` rather than `<AuthLoading>`: while auth is settling we want
  // the sign-in form itself on screen, not a spinner standing in for it.
  const { isAuthenticated } = useConvexAuth();
  useRememberSignedInAccount();

  return (
    <Theme appearance="dark" accentColor="green" grayColor="neutral">
      {isAuthenticated ? <Account /> : <SignIn />}
    </Theme>
  );
}
