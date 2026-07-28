#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Args = Record<string, string | boolean>;

const methods = [
  "google",
  "github",
  "apple",
  "email-password",
  "magic-link",
  "email-otp",
  "sms-otp",
  "anonymous",
  "account-number",
];

const usage = `AussieAuth CLI

Commands:
  aussieauth init expo --scheme myapp
  aussieauth apps register --auth-url https://deployment.convex.site --secret $AUSSIEAUTH_SECRET --slug myapp --name "My App" --scheme myapp --dev-exp
`;

const parse = (argv: string[]) => {
  const positional: string[] = [];
  const flags: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const part = argv[i];
    if (!part.startsWith("--")) {
      positional.push(part);
      continue;
    }
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i++;
    }
  }
  return { positional, flags };
};

const flag = (flags: Args, name: string, fallback = "") => {
  const value = flags[name];
  return typeof value === "string" ? value : fallback;
};

const ensure = async (file: string, content: string) => {
  if (existsSync(file)) return false;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  return true;
};

const readJson = async (file: string) => JSON.parse(await readFile(file, "utf8")) as any;

async function initExpo(flags: Args) {
  const cwd = process.cwd();
  const scheme = flag(flags, "scheme", "myapp");
  const appJson = path.join(cwd, "app.json");
  const layout = path.join(cwd, "app", "_layout.tsx");
  const signIn = path.join(cwd, "app", "sign-in.tsx");
  const authClient = path.join(cwd, "lib", "auth-client.ts");

  if (existsSync(appJson)) {
    const json = await readJson(appJson);
    json.expo ??= {};
    json.expo.scheme ??= scheme;
    await writeFile(appJson, `${JSON.stringify(json, null, 2)}\n`);
  }

  const created = [
    await ensure(
      authClient,
      `import { createAussieAuthExpoClient } from "@aussieljk/auth/expo";
import * as SecureStore from "expo-secure-store";

export const authClient = createAussieAuthExpoClient({
  baseURL: process.env.EXPO_PUBLIC_AUSSIEAUTH_URL!,
  scheme: "${scheme}",
  storage: SecureStore,
});
`,
    ),
    await ensure(
      layout,
      `import { AussieAuthProvider } from "@aussieljk/auth/expo";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function Layout() {
  return (
    <AussieAuthProvider scheme="${scheme}" storage={SecureStore}>
      <Stack />
    </AussieAuthProvider>
  );
}
`,
    ),
    await ensure(
      signIn,
      `import { AussieAuthNativeSignIn } from "@aussieljk/auth/native";
import { router } from "expo-router";
import { authClient } from "../lib/auth-client";

export default function SignIn() {
  return <AussieAuthNativeSignIn authClient={authClient} onSignedIn={() => router.replace("/")} />;
}
`,
    ),
  ].filter(Boolean).length;

  console.log(`AussieAuth Expo files ready. Created ${created} file${created === 1 ? "" : "s"}.`);
  console.log("Install native deps with: npx expo install expo-secure-store expo-web-browser");
}

async function registerApp(flags: Args) {
  const authUrl = flag(flags, "auth-url") || process.env.EXPO_PUBLIC_AUSSIEAUTH_URL || "";
  const secret = flag(flags, "secret") || process.env.AUSSIEAUTH_SECRET || "";
  const slug = flag(flags, "slug");
  const name = flag(flags, "name", slug);
  const scheme = flag(flags, "scheme");
  const origins = flag(flags, "origin")
    ? [flag(flags, "origin")]
    : scheme
      ? [`${scheme.replace(/:\/?\/?$/, "")}://`]
      : [];

  if (flags["dev-exp"]) origins.push("exp://");
  if (!authUrl) throw new Error("--auth-url or EXPO_PUBLIC_AUSSIEAUTH_URL is required");
  if (!secret) throw new Error("--secret or AUSSIEAUTH_SECRET is required");
  if (!slug) throw new Error("--slug is required");
  if (origins.length === 0) throw new Error("--scheme or --origin is required");

  const response = await fetch(`${authUrl.replace(/\/$/, "")}/apps/register`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ slug, name, origins, methods }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Registration failed");
  }
  console.log(JSON.stringify(body, null, 2));
}

async function main() {
  const { positional, flags } = parse(process.argv.slice(2));
  const [scope, command] = positional;
  if (scope === "init" && command === "expo") return initExpo(flags);
  if (scope === "apps" && command === "register") return registerApp(flags);
  console.log(usage);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
