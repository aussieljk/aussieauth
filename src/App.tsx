import { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Avatar, Button, Callout, Heading, Text, TextField } from "frosted-ui";
import { api } from "@/convex/_generated/api";

export default function App() {
  return (
    <main className="p-8">
      <Authenticated>
        <SignedIn />
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </main>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { name: name || email, email, password, flow });
    } catch {
      // Convex Auth deliberately returns opaque errors here so the form can't
      // be used to probe which emails exist.
      setError(
        flow === "signIn"
          ? "Wrong email or password"
          : "Could not create that account",
      );
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto mt-24 flex w-96 flex-col gap-4">
      <Heading size="6">
        {flow === "signIn" ? "Sign in" : "Create your account"}
      </Heading>
      {error && (
        <Callout.Root color="red">
          <Callout.Description>{error}</Callout.Description>
        </Callout.Root>
      )}
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {flow === "signUp" && (
          <TextField.Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <TextField.Input
          type="email"
          placeholder="Email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField.Input
          type="password"
          placeholder="Password"
          autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {/* frosted-ui buttons wrap Base UI, which defaults to type="button" —
            without this the form never submits. */}
        <Button
          type="submit"
          variant="classic"
          disabled={busy || !email || !password}
        >
          {flow === "signIn" ? "Sign in" : "Sign up"}
        </Button>
      </form>
      <button
        className="text-sm text-[var(--gray-11)] underline"
        onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
      >
        {flow === "signIn" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}

function SignedIn() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.auth.currentUser);

  if (!user) return null;

  return (
    <div className="mx-auto mt-24 flex w-96 flex-col gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          size="3"
          src={user.image ?? undefined}
          fallback={(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
        />
        <div className="flex min-w-0 flex-col">
          {user.name && (
            <Text size="2" weight="medium">
              {user.name}
            </Text>
          )}
          <Text size="1" color="gray" className="truncate">
            {user.email}
          </Text>
        </div>
      </div>
      <Button variant="soft" color="gray" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
