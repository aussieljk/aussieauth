import { AussieAuthNativeSignIn } from "@aussieljk/auth/native";
import { RedirectIfSignedIn } from "@aussieljk/auth/expo";
import { router } from "expo-router";
import { authClient } from "../lib/auth-client";

export default function SignIn() {
  return (
    <RedirectIfSignedIn authClient={authClient}>
      <AussieAuthNativeSignIn authClient={authClient} onSignedIn={() => router.replace("/")} />
    </RedirectIfSignedIn>
  );
}
