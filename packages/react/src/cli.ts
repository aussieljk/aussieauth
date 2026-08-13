#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { devOrigins, isLocalOrigin } from "./devOrigins";
import { explainProbe, probeDeployment } from "./probe";
import {
  authConfigFile,
  authUrlForMode,
  ENV_PREFIX,
  deploymentUrl,
  detectFramework,
  type Framework,
  HOSTED_AUTH_URL,
  type Mode,
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

Two ways to use it. The only difference is whose deployment mints the session.

  hosted        aussieauth.com mints it; your Convex deployment verifies it and
  (default)     runs no auth code. Three commands, no credentials, no tables.

  self-hosted   your Convex deployment is an AussieAuth deployment, because you
                forked the repo into it. Every provider credential is yours.

Commands:
  aussieauth                         The whole install: scaffold, register, verify
  aussieauth init                    Same thing, named
  aussieauth init expo               Force the Expo scaffold
  aussieauth doctor                  Check every step, print pass/fail, exit 1 on any fail
  aussieauth apps register           Register this app's origins with a deployment
  aussieauth apps unregister         Revoke an app (dry run unless you confirm)
  aussieauth apps show               What a deployment says about an origin

No secret is needed for a development origin — localhost, a *.local name, a LAN
address, on any port. Those are trusted by the deployment on sight, and register
without credentials. Only a public origin needs AUSSIEAUTH_SECRET.

init
  --self-hosted                      Mint sessions from this project's own
                                     deployment instead of ${HOSTED_AUTH_URL.replace("https://", "")}.
  --url <https://….convex.site>      An AussieAuth deployment of your own. Wins over both.
  --origin <https://localhost:5173>  The dev origin to register. Derived from the framework.
  --slug <name>                      App slug. Defaults to the package name.
  --scheme <myapp>                   Expo only: the deep-link scheme.
  --no-register                      Write the files, skip registering.
  --no-convex                        Skip convex/auth.config.ts.

apps register
  --auth-url <url>                   Or AUSSIEAUTH_URL / EXPO_PUBLIC_AUSSIEAUTH_URL.
  --secret <secret>                  Or AUSSIEAUTH_SECRET. Public origins only.
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
  let existing = await readText(file);
  const have = parseEnvFile(existing);

  // One exception to "without touching what's there": a key we own that
  // already holds a *different* value. Appending would be ignored by every
  // dotenv reader, which is how a project ends up pointed at its own Convex
  // deployment — a URL that answers, serves no auth, and looks right in the
  // report because the report prints what we chose rather than what the file
  // says. The value is checked, so a correction only happens when the file and
  // the truth disagree.
  const corrected: string[] = [];
  for (const [key, value] of Object.entries(entries)) {
    if (!value || !have[key] || have[key] === value) continue;
    existing = existing.replace(
      new RegExp(`^(\\s*(?:export\\s+)?${key}\\s*=).*$`, "m"),
      `$1${value}`,
    );
    corrected.push(`${key} (was ${have[key]})`);
  }
  if (corrected.length) await writeFile(file, existing);

  const missing = Object.entries(entries).filter(([key, value]) => value && !have[key]);
  if (!missing.length) return corrected;

  const block = missing.map(([key, value]) => `${key}=${value}`).join("\n");
  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  await writeFile(file, `${existing}${prefix}\n# AussieAuth\n${block}\n`);
  return [...corrected, ...missing.map(([key]) => key)];
};

/**
 * The file that makes `ctx.auth.getUserIdentity()` return someone in the app's
 * own functions.
 *
 * Written only when the project has a `convex/` directory: `init` is for the
 * frontend as much as the backend, and a `convex/` folder appearing in a
 * project that has no Convex is a confusing thing to find.
 */
const writeAuthConfig = async (cwd: string, mode: Mode, authUrl: string) => {
  const dir = path.join(cwd, "convex");
  if (!existsSync(dir)) return "";
  const file = path.join("convex", "auth.config.ts");
  return (await ensure(path.join(cwd, file), authConfigFile(mode, authUrl))) ? file : "";
};

async function initExpo(flags: Args, env: Record<string, string>, mode: Mode) {
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

  const url = authUrlForMode(mode, env, flag(flags, "url"));
  if (!flags["no-convex"]) {
    const config = await writeAuthConfig(cwd, mode, url);
    if (config) written.push(config);
  }
  const added = await appendEnv(cwd, { EXPO_PUBLIC_AUSSIEAUTH_URL: url });

  report("expo", mode, written, added, url);
  console.log("  Install native deps: npx expo install expo-secure-store expo-web-browser");
  return { url, origins: [`${scheme.replace(/:\/?\/?$/, "")}://`, "exp://"], scheme };
}

async function initWeb(
  framework: Framework,
  flags: Args,
  repeated: Record<string, string[]>,
  env: Record<string, string>,
  mode: Mode,
) {
  const cwd = process.cwd();
  const pkg = await readJson(path.join(cwd, "package.json")).catch(() => ({}));
  const slug = flag(flags, "slug") || String(pkg.name ?? "my-app").replace(/^@[^/]+\//, "");
  const appName = flag(flags, "name") || slug;

  const written: string[] = [];
  for (const { file, content } of webLayout(framework, appName)) {
    if (await ensure(path.join(cwd, file), content)) written.push(file);
  }

  const url = authUrlForMode(mode, env, flag(flags, "url"));
  if (!flags["no-convex"]) {
    const config = await writeAuthConfig(cwd, mode, url);
    if (config) written.push(config);
  }
  const prefix = ENV_PREFIX[framework];
  const added = await appendEnv(cwd, {
    [`${prefix}AUSSIEAUTH_URL`]: url,
    // Only written when the project already knows it; we never invent one.
    [`${prefix}CONVEX_URL`]: env.CONVEX_URL ?? env[`${prefix}CONVEX_URL`] ?? "",
  });

  report(framework, mode, written, added, url);
  return {
    url,
    origins: devOrigins({
      framework,
      scripts: (pkg.scripts ?? {}) as Record<string, string | undefined>,
      name: String(pkg.name ?? path.basename(cwd)),
      explicit: repeated.origin ?? (flag(flags, "origin") ? [flag(flags, "origin")] : []),
    }),
    slug,
    name: appName,
  };
}

const report = (framework: string, mode: Mode, written: string[], env: string[], url: string) => {
  console.log(`AussieAuth · ${framework} · ${mode}`);
  console.log(
    mode === "hosted"
      ? `  sessions minted by ${url}\n` +
          `  verified by this project's own deployment — no auth code, no auth tables here`
      : `  sessions minted and verified by this project's own deployment (${url})`,
  );
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
 * Two things make it no-touch rather than a scaffold you then wire up. The
 * first is that it registers the dev origin in the same pass, so `localhost`
 * works before anyone has read a word about origins — without it the scaffold
 * produces a card that renders and then fails on click, which is the worst of
 * the two possible outcomes. The second is `convex/auth.config.ts`: identity in
 * the app's own functions is the thing people assume they get and don't, and in
 * hosted mode it is the *only* backend file the app needs.
 */
async function init(positional: string[], flags: Args, repeated: Record<string, string[]>) {
  const cwd = process.cwd();
  const env = await readProjectEnv(cwd);
  const pkg = await readJson(path.join(cwd, "package.json")).catch(() => ({}));
  const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

  // Hosted unless asked otherwise. `--url` names an AussieAuth of your own,
  // which is self-hosting by any other name.
  const mode: Mode = flags["self-hosted"] || flag(flags, "url") ? "self-hosted" : "hosted";

  const forced = positional[1] as Framework | undefined;
  const framework = forced ?? detectFramework(deps, (file) => existsSync(path.join(cwd, file)));

  if (framework === "unknown") {
    throw new Error(
      "Couldn't tell what kind of app this is. Run it from the project root, or name the " +
        "framework: aussieauth init vite | next | tanstack-start | expo",
    );
  }

  // Before a single file is written. A URL that turns out to be the wrong
  // deployment gets baked into `.env.local` and `convex/auth.config.ts`, and
  // from then on every symptom points somewhere else.
  const target = authUrlForMode(mode, env, flag(flags, "url"));
  if (!target) {
    throw new Error(
      "Couldn't work out which deployment to use. Run `bunx convex dev` first, or pass " +
        "--url <https://your-deployment.convex.site> — note .convex.site, not .convex.cloud.",
    );
  }
  const probe = await probeDeployment(target);
  const wrong = explainProbe(probe);
  if (wrong) {
    // Thrown rather than warned. A scaffold that completes against a
    // deployment which cannot serve it is the exact outcome this whole command
    // exists to prevent: everything reads as done, and the failure arrives
    // later wearing a different face.
    throw new Error(`${wrong}\n\n  Nothing was written.`);
  }

  const result =
    framework === "expo"
      ? await initExpo(flags, env, mode)
      : await initWeb(framework, flags, repeated, env, mode);

  if (flags["no-register"]) return finish(mode);

  const secret = flag(flags, "secret") || process.env.AUSSIEAUTH_SECRET || "";
  const origins = result.origins.filter(Boolean);
  if (!origins.length) {
    // Expo without a scheme is the only way to get here.
    throw new Error(
      "No origin to register. Pass --scheme <myapp> for a native app, or --origin " +
        "<https://…> for a web one.",
    );
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
  finish(mode);
}

/**
 * The one command left to run.
 *
 * `init` writes `convex/auth.config.ts` into the project but cannot push it —
 * that's the deployment's own CLI — and a config that exists locally and not on
 * the deployment fails in the one way that looks like a bug in the card:
 * sign-in succeeds, and every function still sees `null`.
 */
const finish = (mode: Mode) => {
  console.log(`\n  Push it:  bunx convex dev\n`);
  if (mode === "hosted") {
    console.log(
      `  That's the whole setup. Nothing in this project runs auth code — it\n` +
        `  verifies a signature against ${HOSTED_AUTH_URL}'s public key.\n` +
        `  Add a method, a provider credential or a branded domain by self-hosting\n` +
        `  later: aussieauth.com/docs/self-hosted.`,
    );
  }
};

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
    headers: {
      // Sent only when there is one. A dev-origin registration needs no
      // secret, and an `Authorization: Bearer ` with nothing after it reads to
      // the server as a wrong secret rather than as no secret.
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      "content-type": "application/json",
    },
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

  const skipped: string[] = Array.isArray(body.skipped) ? body.skipped : [];
  const claimed = input.origins.filter((o) => !skipped.includes(o));

  console.log(`Registered "${input.slug}" with ${claimed.length} origin(s):`);
  for (const origin of claimed) console.log(`  ${origin}`);
  if (skipped.length) {
    // Worth a line rather than silence, and worth not being an error: another
    // project on this machine got to that port first, and sign-in works from
    // it regardless because dev origins are trusted whoever owns the row.
    console.log(
      `  also works on ${skipped.join(", ")} — already claimed by another app,\n` +
        `  and trusted anyway because it's a development origin`,
    );
  }
  if (body.restored) {
    console.log(`  (restored from a previous revoke, with its method list intact)`);
  }

  const passkeys = body.passkeyOrigins as
    | { limit: number; active: string[]; dropped: string[] }
    | undefined;
  // A dropped *dev* origin is not a problem to go and solve, and saying
  // "⚠ passkeys will not work" about one sends the reader — an agent, usually
  // — off fixing something that was never wrong. Passkeys on another machine's
  // localhost are not a feature anyone is owed.
  const droppedReal = (passkeys?.dropped ?? []).filter((o) => !isLocalOrigin(o));
  if (droppedReal.length && passkeys) {
    console.warn(
      `\n  ⚠ Passkeys will not work on ${droppedReal.length} origin(s).\n` +
        `    WebAuthn honours related origins on at most ${passkeys.limit} distinct sites, and\n` +
        `    browsers ignore the rest without an error anywhere. Past the limit:\n` +
        droppedReal.map((o) => `      ${o}`).join("\n") +
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
  // The secret is not required here any more. A registration whose origins are
  // all development ones is accepted without it, and only the server can tell
  // whether that is the case — refusing here would put a check in front of the
  // endpoint that is stricter than the endpoint.
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
  // Revoking has no secretless form, unlike registering: taking access away is
  // not something an origin can ask for on its own behalf.
  if (!secret) throw new Error("--secret or AUSSIEAUTH_SECRET is required to revoke an app");

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

/**
 * Every check that stands between this project and a working sign-in, run in
 * one go and printed as a table.
 *
 * The audience is an agent as much as a person. Something reading this needs
 * to know which of six things is wrong without inferring it from a stack
 * trace, so every line is `ok`/`FAIL` with the fix on the failing ones, and
 * the exit code carries the same answer for anything that only reads that.
 */
async function doctorCommand(flags: Args) {
  const cwd = process.cwd();
  const env = await readProjectEnv(cwd);
  const pkg = await readJson(path.join(cwd, "package.json")).catch(() => ({}));
  const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };
  const framework = detectFramework(deps, (file) => existsSync(path.join(cwd, file)));

  const url = siteUrlFromConvexUrl(
    flag(flags, "url") || flag(flags, "auth-url") || deploymentUrl(env) || HOSTED_AUTH_URL,
  );
  const origins = devOrigins({
    framework,
    scripts: (pkg.scripts ?? {}) as Record<string, string | undefined>,
    name: String(pkg.name ?? path.basename(cwd)),
    explicit: flag(flags, "origin") ? [flag(flags, "origin")] : [],
  });

  const lines: string[] = [];
  let failed = false;
  const check = (ok: boolean, label: string, fix = "") => {
    lines.push(`  ${ok ? "ok  " : "FAIL"}  ${label}`);
    if (!ok) {
      failed = true;
      if (fix) lines.push(`        ${fix}`);
    }
  };

  console.log(`AussieAuth doctor · ${framework} · ${url}\n`);

  const probe = await probeDeployment(url);
  check(probe.reachable, "deployment answers", "wrong URL, or nothing deployed there");
  check(probe.servesAuth, "serves auth (/api/auth/ok)", "this is not an AussieAuth deployment");
  check(probe.publishesKeys, "publishes a JWKS", "tokens minted here can't be verified");
  check(
    probe.health && !probe.missing.length,
    "up to date with this client",
    probe.health ? `missing: ${probe.missing.join(", ")}` : "no /apps/health — push the deployment",
  );

  const hasConfig = existsSync(path.join(cwd, "convex", "auth.config.ts"));
  check(
    hasConfig || !existsSync(path.join(cwd, "convex")),
    "convex/auth.config.ts exists",
    "run `aussieauth init` — without it every function sees a null identity",
  );

  // Asked per origin rather than once, because being trusted is a property of
  // the origin and a project can be served on more than one.
  for (const origin of origins) {
    const answer = await fetch(`${url}/apps/me`, { headers: { origin } })
      .then((r) => (r.ok ? (r.json() as Promise<{ trusted?: boolean; slug?: string | null }>) : null))
      .catch(() => null);
    check(
      Boolean(answer?.trusted),
      `${origin} is trusted${answer?.slug ? ` (as "${answer.slug}")` : ""}`,
      `aussieauth apps register --auth-url ${url} --slug <app> --origin ${origin}`,
    );
  }

  console.log(lines.join("\n"));
  if (failed) {
    process.exitCode = 1;
    console.log(`\n${explainProbe(probe) || "  Fix the FAIL lines above and run this again."}`);
  } else {
    console.log(`\n  Nothing to do. Sign-in works from ${origins.join(", ") || "this project"}.`);
  }
}

async function main() {
  const { positional, flags, repeated } = parse(process.argv.slice(2));
  const [scope, command] = positional;
  // No subcommand is the whole install. The command an agent reaches for first
  // should be the one that finishes the job, not a help screen — the previous
  // behaviour was to print usage and let the reader pick, which is how a setup
  // ends up half-done in three different ways.
  if (!scope) return init(["init"], flags, repeated);
  if (scope === "init") return init(positional, flags, repeated);
  if (scope === "doctor") return doctorCommand(flags);
  if (scope === "apps" && command === "register") return registerCommand(flags, repeated);
  if (scope === "apps" && command === "unregister") return unregisterCommand(flags);
  if (scope === "apps" && (command === "show" || command === "me")) return showCommand(flags);
  console.log(usage);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
