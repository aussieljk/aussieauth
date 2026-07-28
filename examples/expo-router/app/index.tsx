import { RequireAuth, signOutAndRedirect, useAussieUser } from "@aussieljk/auth/expo";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { authClient } from "../lib/auth-client";

export default function Index() {
  return (
    <RequireAuth authClient={authClient}>
      <Home />
    </RequireAuth>
  );
}

function Home() {
  const { user } = useAussieUser(authClient);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 30, fontWeight: "700" }}>Signed in</Text>
        <Text selectable style={{ fontSize: 16 }}>
          {user?.email ?? user?.name ?? user?.id ?? "Current account"}
        </Text>
      </View>
      <Pressable
        onPress={() => void signOutAndRedirect(authClient, router.replace, "/sign-in")}
        style={{ minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#0a84ff" }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
