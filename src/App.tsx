import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Spinner, Theme } from "frosted-ui";
import { Account } from "./account/Account";
import { SignIn } from "./auth/SignIn";

export default function App() {
  return (
    <Theme appearance="light" accentColor="indigo" grayColor="slate">
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="3" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      <Authenticated>
        <Account />
      </Authenticated>
    </Theme>
  );
}
