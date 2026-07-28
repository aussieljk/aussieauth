import { AussieAuthProvider } from "@aussieljk/auth/expo";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function Layout() {
  return (
    <AussieAuthProvider scheme="aussieauthdemo" storage={SecureStore}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="sign-in" options={{ title: "Sign in", presentation: "modal" }} />
      </Stack>
    </AussieAuthProvider>
  );
}
