#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  DEV_ORIGIN,
  ENV_PREFIX,
  deploymentUrl,
  detectFramework,
  type Framework,
  parseEnvFile,
  siteUrlFromConvexUrl,
} from "./deployment";

type Args = Record<string, string | boolean>;

/**
 * Every method the card can offer, which is what an app gets when it doesn't
 * say otherwise.
 *
 * This list used to be nine long and silently missing `passkey`, `solana`,
 * `demo`, `username-password`, `phone-password` and `agent` — so an app that
 * registered through the CLI had those enforced *off*, and found out by
 * clicking a button that 403'd. The card's `PROVIDERS` is the source of truth;
 * these ids are the same ones.
 */
const ALL_METHODS = [
  "google",
  "github",
  "apple",
  "solana",
  "passkey",
  "email-password",
  "phone-password",
  "username-password",
  "magic-link",
  "email-otp",
  "ios-otp",
  "demo",
  "anonymous",
  "account-number",
  "agent",
];

const usage = `AussieAuth CLI

Commands:
  aussieauth init                    Scaffold auth into the app in this directory
  aussieauth init expo               Force the Expo scaffold
  aussieauth apps register           Register this app's origins with a deployment
  aussieauth apps unregister         Revoke an app (dry run unless you confirm)
  aussieauth apps show               What a deployment says about an origin

init
  --url <https://….convex.site>      The deployment. Derived from .env.local when omitted.
  --origin <https://localhost:5173>  The dev origin to register. Derived from the framework.
  --slug <name>                      App slug. Defaults to the package name.
  --scheme <myapp>                   Expo only: the deep-link scheme.
  --no-register                      Write the files, skip registering.

apps register
  --auth-url <url>                   Or AUSSIEAUTH_URL / EXPO_PUBLIC_AUSSIEAUTH_URL.
  --secret <secret>                  Or AUSSIEAUTH_SECRET.
  --slug <name> --name "My App"
  --origin <url>                     Repeatable, or comma-separated.
  --scheme <myapp> [--dev-exp]       Native apps register a scheme, not an origin.
  --methods a,b,c                    Defaults to all ${ALL_METHODS.length}.

apps unregister --slug <name>        Prints what would be revoked and stops.
  --confirm                          Actually revoke it. Asks you to type the slug.
  --yes                              Skip the prompt (for scripts).
`;

const parse = (argv: string[]) => {
  const positional: string[] = [];
  const flags: Args = {};
  /** Repeated flags collect rather than overwrite — `--origin a --origin b`. */
  const repeated: Record<string, string[]> = {};
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
      (repeated[key] ??= []).push(next);
      i++;
    }
  }
  return { positional, flags, repeated };
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

const readText = async (file: string) => readFile(file, "utf8").catch(() => "");

// ---------------------------------------------------------------------------
// Working out where the deployment is, and what kind of app is asking
// ---------------------------------------------------------------------------

/** Lowest precedence first, so a later file wins — `.env.local` is `convex dev`'s. */
const envFiles = [".env", ".env.development.local", ".env.local"];

const readProjectEnv = async (cwd: string) => {
  const merged: Record<string, string> = {};
  for (const name of envFiles) {
    Object.assign(merged, parseEnvFile(await readText(path.join(cwd, name))));
  }
  return merged;
};

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

const WEB_PROVIDER = (framework: Framework) => {
  const client = framework === "next" ? '"use client";\n\n' : "";
  return `${client}import { AussieAuthProvider } from "@aussieljk/auth/convex";
// The card ships its own styles; this is the only CSS wiring it needs.
import "@aussieljk/auth/styles.css";
import type { ReactNode } from "react";

/**
 * One provider: the AussieAuth client, the Convex client, and the context the
 * sign-in card reads its client from.
 *
 * Both URLs come from the environment — see .env.local. Pass \`authUrl\` or
 * \`convexUrl\` explicitly if your bundler doesn't inline them.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <AussieAuthProvider>{children}</AussieAuthProvider>;
}
`;
};

const WEB_SIGN_IN = (framework: Framework, appName: string) => {
  const client = framework === "next" ? '"use client";\n\n' : "";
  return `${client}import { AussieAuthSignIn } from "@aussieljk/auth";

export default function SignInPage() {
  return <AussieAuthSignIn appName="${appName}" />;
}
`;
};

const START_ROUTE = (appName: string) => `import { createFileRoute } from "@tanstack/react-router";
import { AussieAuthSignIn } from "@aussieljk/auth";

export const Route = createFileRoute("/sign-in")({
  // The card touches browser globals (WebAuthn, portals), so it mounts in the
  // browser rather than during the prerender.
  ssr: false,
  component: () => <AussieAuthSignIn appName="${appName}" />,
});
`;

/** Which files each web framework wants, and where. */
const webLayout = (framework: Framework, appName: string) => {
  if (framework === "next") {
    return [
      { file: path.join("app", "providers.tsx"), content: WEB_PROVIDER(framework) },
      { file: path.join("app", "sign-in", "page.tsx"), content: WEB_SIGN_IN(framework, appName) },
    ];
  }
  if (framework === "tanstack-start") {
    return [
      { file: path.join("src", "auth", "Providers.tsx"), content: WEB_PROVIDER(framework) },
      { file: path.join("src", "routes", "sign-in.tsx"), content: START_ROUTE(appName) },
    ];
  }
  return [
    { file: path.join("src", "auth", "Providers.tsx"), content: WEB_PROVIDER(framework) },
    { file: path.join("src", "auth", "SignInPage.tsx"), content: WEB_SIGN_IN(framework, appName) },
  ];
};

/**
 * Adds the variables the generated code reads, without touching what's there.
 *
 * Appending rather than rewriting because `.env.local` is `convex dev`'s file
 * as much as ours, and a rewrite that dropped `CONVEX_DEPLOYMENT` would
 * disconnect the project from its backend.
 */
const appendEnv = async (cwd: string, entries: Record<string, string>) => {
  const file = path.join(cwd, ".env.local");
  const existing = await readText(file);
  const have = parseEnvFile(existing);
  const missing = Object.entries(entries).filter(([key, value]) => value && !have[key]);
  if (!missing.length) return [];

  const block = missing.map(([key, value]) => `${key}=${value}`).join("\n");
  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  await writeFile(file, `${existing}${prefix}\n# AussieAuth\n${block}\n`);
  return missing.map(([key]) => key);
};

async function initExpo(flags: Args, env: Record<string, string>) {
  const cwd = process.cwd();
  const scheme = flag(flags, "scheme", "myapp");
  const appJson = path.join(cwd, "app.json");

  if (existsSync(appJson)) {
    const json = await readJson(appJson);
    json.expo ??= {};
    json.expo.scheme ??= scheme;
    await writeFile(appJson, `${JSON.stringify(json, null, 2)}\n`);
  }

  const files = [
    {
      file: path.join("lib", "auth-client.ts"),
      content: `import { createAussieAuthExpoClient } from "@aussieljk/auth/expo";
import * as SecureStore from "expo-secure-store";

export const authClient = createAussieAuthExpoClient({
  baseURL: process.env.EXPO_PUBLIC_AUSSIEAUTH_URL!,
  scheme: "${scheme}",
  storage: SecureStore,
});
`,
    },
    {
      file: path.join("app", "_layout.tsx"),
      content: `import { AussieAuthProvider } from "@aussieljk/auth/expo";
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
    },
    {
      file: path.join("app", "sign-in.tsx"),
      content: `import { AussieAuthNativeSignIn } from "@aussieljk/auth/native";
import { router } from "expo-router";
import { authClient } from "../lib/auth-client";

export default function SignIn() {
  return <AussieAuthNativeSignIn authClient={authClient} onSignedIn={() => router.replace("/")} />;
}
`,
    },
  ];

  const written: string[] = [];
  for (const { file, content } of files) {
    if (await ensure(path.join(cwd, file), content)) written.push(file);
  }

  const url = flag(flags, "url") || deploymentUrl(env);
  const added = await appendEnv(cwd, { EXPO_PUBLIC_AUSSIEAUTH_URL: url });

  report("expo", written, added, url);
  console.log("  Install native deps: npx expo install expo-secure-store expo-web-browser");
  return { url, origins: [`${scheme.replace(/:\/?\/?$/, "")}://`, "exp://"], scheme };
}

async function initWeb(framework: Framework, flags: Args, env: Record<string, string>) {
  const cwd = process.cwd();
  const pkg = await readJson(path.join(cwd, "package.json")).catch(() => ({}));
  const slug = flag(flags, "slug") || String(pkg.name ?? "my-app").replace(/^@[^/]+\//, "");
  const appName = flag(flags, "name") || slug;

  const written: string[] = [];
  for (const { file, content } of webLayout(framework, appName)) {
    if (await ensure(path.join(cwd, file), content)) written.push(file);
  }

  const url = flag(flags, "url") || deploymentUrl(env);
  const prefix = ENV_PREFIX[framework];
  const added = await appendEnv(cwd, {
    [`${prefix}AUSSIEAUTH_URL`]: url,
    // Only written when the project already knows it; we never invent one.
    [`${prefix}CONVEX_URL`]: env.CONVEX_URL ?? env[`${prefix}CONVEX_URL`] ?? "",
  });

  report(framework, written, added, url);
  return { url, origins: [flag(flags, "origin") || DEV_ORIGIN[framework]], slug, name: appName };
}

const report = (framework: string, written: string[], env: string[], url: string) => {
  console.log(`AussieAuth · ${framework}`);
  if (written.length) for (const file of written) console.log(`  created  ${file}`);
  else console.log("  nothing to create — the files were already there");
  if (env.length) console.log(`  .env.local  ${env.join(", ")}`);
  if (!url) {
    console.log(
      "\n  Couldn't work out the deployment URL. Run `bunx convex dev` first, or pass --url\n" +
        "  <https://your-deployment.convex.site> — note .convex.site, not .convex.cloud.",
    );
  }
};

/**
 * `init`, all the way to a sign-in that works.
 *
 * The step that used to be missing is the last one: registering the dev origin
 * in the same pass, so `localhost` works before anyone has read a word about
 * origins. Without it the scaffold produces a card that renders and then fails
 * on click, which is the worst of the two possible outcomes.
 */
async function init(positional: string[], flags: Args) {
  const cwd = process.cwd();
  const env = await readProjectEnv(cwd);
  const pkg = await readJson(path.join(cwd, "package.json")).catch(() => ({}));
  const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

  const forced = positional[1] as Framework | undefined;
  const framework = forced ?? detectFramework(deps, (file) => existsSync(path.join(cwd, file)));

  if (framework === "unknown") {
    throw new Error(
      "Couldn't tell what kind of app this is. Run it from the project root, or name the " +
        "framework: aussieauth init vite | next | tanstack-start | expo",
    );
  }

  const result =
    framework === "expo" ? await initExpo(flags, env) : await initWeb(framework, flags, env);

  if (flags["no-register"]) return;

  const secret = flag(flags, "secret") || process.env.AUSSIEAUTH_SECRET || "";
  const origins = result.origins.filter(Boolean);
  if (!secret || !result.url || !origins.length) {
    console.log(
      `\n  Register this app when you have the deployment's secret:\n` +
        `    aussieauth apps register --auth-url ${result.url || "<url>"} ` +
        `--slug ${"slug" in result ? result.slug : "<slug>"} ` +
        origins.map((o) => `--origin ${o}`).join(" "),
    );
    return;
  }

  console.log("");
  await register({
    authUrl: result.url,
    secret,
    slug: "slug" in result ? result.slug : path.basename(cwd),
    name: "name" in result ? result.name : path.basename(cwd),
    origins,
    methods: ALL_METHODS,
  });
}

// ---------------------------------------------------------------------------
// apps
// ---------------------------------------------------------------------------

type RegisterInput = {
  authUrl: string;
  secret: string;
  slug: string;
  name: string;
  origins: string[];
  methods: string[];
};

const post = async (authUrl: string, endpoint: string, secret: string, body: unknown) => {
  const response = await fetch(`${authUrl.replace(/\/$/, "")}${endpoint}`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await response.json().catch(() => ({}) as any);
  if (!response.ok) {
    throw new Error(typeof parsed.error === "string" ? parsed.error : `${endpoint} failed`);
  }
  return parsed;
};

/**
 * Register, and say something about the passkey budget.
 *
 * WebAuthn honours related origins on at most five distinct sites and a
 * browser ignores the overflow *in silence* — so the sixth app to register
 * gets passkeys that simply don't work, with no error on the app, the server
 * or the console. The server has always answered with `passkeyOrigins.dropped`
 * and nothing ever read it, which put the one piece of evidence that would
 * explain the failure into a JSON blob nobody opens.
 */
async function register(input: RegisterInput) {
  const body = await post(input.authUrl, "/apps/register", input.secret, {
    slug: input.slug,
    name: input.name,
    origins: input.origins,
    methods: input.methods,
  });

  console.log(`Registered "${input.slug}" with ${input.origins.length} origin(s):`);
  for (const origin of input.origins) console.log(`  ${origin}`);
  if (body.restored) {
    console.log(`  (restored from a previous revoke, with its method list intact)`);
  }

  const passkeys = body.passkeyOrigins as
    | { limit: number; active: string[]; dropped: string[] }
    | undefined;
  if (passkeys?.dropped?.length) {
    console.warn(
      `\n  ⚠ Passkeys will not work on ${passkeys.dropped.length} origin(s).\n` +
        `    WebAuthn honours related origins on at most ${passkeys.limit} distinct sites, and\n` +
        `    browsers ignore the rest without an error anywhere. Past the limit:\n` +
        passkeys.dropped.map((o) => `      ${o}`).join("\n") +
        `\n    Unregister an app you no longer use, or consolidate onto fewer sites.`,
    );
  } else if (passkeys) {
    const sites = new Set(passkeys.active.map(site)).size;
    console.log(`  passkey sites: ${sites}/${passkeys.limit} used`);
  }
  return body;
}

/** Good enough for counting distinct sites: last two dot-separated parts. */
const site = (origin: string) => {
  try {
    return new URL(origin).hostname.split(".").slice(-2).join(".");
  } catch {
    return origin;
  }
};

const requireEnv = (flags: Args) => {
  const authUrl =
    flag(flags, "auth-url") ||
    process.env.AUSSIEAUTH_URL ||
    process.env.EXPO_PUBLIC_AUSSIEAUTH_URL ||
    "";
  const secret = flag(flags, "secret") || process.env.AUSSIEAUTH_SECRET || "";
  if (!authUrl) throw new Error("--auth-url or AUSSIEAUTH_URL is required");
  if (!secret) throw new Error("--secret or AUSSIEAUTH_SECRET is required");
  return { authUrl: siteUrlFromConvexUrl(authUrl), secret };
};

async function registerCommand(flags: Args, repeated: Record<string, string[]>) {
  const { authUrl, secret } = requireEnv(flags);
  const slug = flag(flags, "slug");
  const name = flag(flags, "name", slug);
  const scheme = flag(flags, "scheme");

  const origins = [
    ...(repeated.origin ?? []).flatMap((value) => value.split(",")),
    ...(scheme ? [`${scheme.replace(/:\/?\/?$/, "")}://`] : []),
  ]
    .map((o) => o.trim())
    .filter(Boolean);
  if (flags["dev-exp"]) origins.push("exp://");

  if (!slug) throw new Error("--slug is required");
  if (origins.length === 0) throw new Error("--scheme or --origin is required");

  const methods = flag(flags, "methods")
    ? flag(flags, "methods")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : ALL_METHODS;

  await register({ authUrl, secret, slug, name, origins, methods });
}

/** Whether we can ask a human anything at all. */
const interactive = () => process.stdin.isTTY && process.stdout.isTTY;

const ask = async (question: string) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
};

/**
 * Revoke, with the two guards the shape of the request didn't have.
 *
 * Registering is idempotent and safe to repeat; revoking is neither, and they
 * sat behind the same secret with the same body. So the server answers with a
 * preview unless the request explicitly asks for the destructive form, and the
 * CLI prints the origins it is about to take away and makes you type the slug
 * back — the same shape as every other "type the name to confirm" flow.
 */
async function unregisterCommand(flags: Args) {
  const { authUrl, secret } = requireEnv(flags);
  const slug = flag(flags, "slug");
  if (!slug) throw new Error("--slug is required");

  const preview = await post(authUrl, "/apps/unregister", secret, { slug });
  if (!preview.wouldRemove) {
    console.log(`Nothing to revoke — "${slug}" isn't registered on ${authUrl}.`);
    return;
  }

  const { name, origins, methods } = preview.wouldRemove as {
    name: string;
    origins: string[];
    methods: string[] | null;
  };
  console.log(`Revoking "${slug}" (${name}) on ${authUrl} would remove:`);
  for (const origin of origins) console.log(`  ${origin}`);
  console.log(`  methods: ${methods ? methods.join(", ") : "all"}`);
  console.log(
    "\nExisting sessions keep working. Every new sign-in from those origins stops immediately.",
  );

  if (!flags.confirm) {
    console.log(`\nAdd --confirm to go ahead. Nothing has changed.`);
    return;
  }

  if (!flags.yes) {
    if (!interactive()) {
      throw new Error("Refusing to revoke without a terminal to confirm on. Pass --yes.");
    }
    const typed = await ask(`\nType the slug to confirm (${slug}): `);
    if (typed !== slug) {
      console.log("Doesn't match. Nothing has changed.");
      return;
    }
  }

  const result = await post(authUrl, "/apps/unregister", secret, { slug, confirm: true });
  console.log(`\nRevoked "${slug}". ${result.origins?.length ?? 0} origin(s) removed.`);
  console.log(
    `Re-register it to restore those origins and its method list:\n` +
      `  aussieauth apps register --slug ${slug} ${origins.map((o) => `--origin ${o}`).join(" ")}`,
  );
}

/** "Who am I to you?" — the endpoint the card reads, from a terminal. */
async function showCommand(flags: Args) {
  const fromProject = deploymentUrl(await readProjectEnv(process.cwd()));
  const authUrl = siteUrlFromConvexUrl(
    flag(flags, "auth-url") || process.env.AUSSIEAUTH_URL || fromProject,
  );
  if (!authUrl) throw new Error("--auth-url or AUSSIEAUTH_URL is required");
  const origin = flag(flags, "origin");
  if (!origin) throw new Error("--origin is required");

  const response = await fetch(`${authUrl}/apps/me`, { headers: { origin } });
  const body = (await response.json()) as {
    registered: boolean;
    slug: string | null;
    name: string | null;
    methods: string[] | null;
  };

  if (!body.registered) {
    console.log(`${authUrl} does not recognise ${origin}.`);
    console.log(`  aussieauth apps register --slug <your-app> --origin ${origin}`);
    return;
  }
  console.log(`${origin} → "${body.name}" (${body.slug})`);
  console.log(`  methods: ${body.methods ? body.methods.join(", ") : "all"}`);
}

async function main() {
  const { positional, flags, repeated } = parse(process.argv.slice(2));
  const [scope, command] = positional;
  if (scope === "init") return init(positional, flags);
  if (scope === "apps" && command === "register") return registerCommand(flags, repeated);
  if (scope === "apps" && command === "unregister") return unregisterCommand(flags);
  if (scope === "apps" && (command === "show" || command === "me")) return showCommand(flags);
  console.log(usage);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
