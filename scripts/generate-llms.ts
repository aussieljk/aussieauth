/**
 * Builds the machine-readable half of the docs from docs/**\/*.docs.mdx.
 *
 * Runs as `prebuild`, so the site and the files an LLM reads are generated from
 * one source and can't disagree:
 *
 *   public/llms.txt        an index, with a line about each page
 *   public/llms-full.txt   every page concatenated, in `order`
 *   public/docs/<slug>.md  each page as raw markdown
 *   public/sitemap.xml     the readable pages, and only those
 *
 * The raw markdown matters more than it looks: crawlers that read documentation
 * generally don't run JavaScript, and markdown costs them nothing to parse.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const docsDir = join(root, "docs");
const publicDir = join(root, "public");
const SITE = "https://aussieauth.com";

type Doc = {
  slug: string;
  title: string;
  description: string;
  order: number;
  /** The file with its frontmatter block removed. */
  body: string;
};

const markdownFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".docs.mdx") ? [full] : [];
  });

/**
 * Enough YAML for `title`, `description` and `order` on one line each — which
 * is all any doc has. A parser dependency here would be three keys of overkill.
 */
const parse = (file: string): Doc => {
  const raw = readFileSync(file, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) throw new Error(`${relative(root, file)}: no frontmatter block`);

  const field = (name: string) => {
    const found = new RegExp(`^${name}:\\s*(.+)$`, "m").exec(match[1]);
    if (!found) throw new Error(`${relative(root, file)}: missing \`${name}\``);
    return found[1].trim().replace(/^["']|["']$/g, "");
  };

  return {
    slug: relative(docsDir, file)
      .replace(/\.docs\.mdx$/, "")
      .replace(/(^|\/)index$/, ""),
    title: field("title"),
    description: field("description"),
    order: Number(field("order")),
    body: raw.slice(match[0].length).trim(),
  };
};

const docs = markdownFiles(docsDir)
  .map(parse)
  .sort((a, b) => a.order - b.order);

const urlFor = (slug: string) => `${SITE}/docs${slug ? `/${slug}` : ""}`;
const rawUrlFor = (slug: string) => `${SITE}/docs/${slug || "index"}.md`;

const SUMMARY = `AussieAuth is a self-hosted authentication server built on Convex and Better Auth. It offers fifteen sign-in methods — Google, GitHub, Apple, Solana wallet, passkeys, email/password, phone/password, username/password, magic links, email OTP, SMS codes, a shared demo account, anonymous sessions, Mullvad-style account numbers, and API keys for agents. Unlike a hosted auth provider it has no consent screen of its own: an app that uses AussieAuth talks to the Convex deployment from its own origin, so a user signing in with Google sees Google's consent screen and nothing else.`;

/**
 * The first thing an agent reads, and the reason this block exists.
 *
 * An agent adding AussieAuth to someone's app has no way to obtain a secret,
 * open a dashboard or pick a port — so if the docs leave any of those implied,
 * it improvises, and the person it is working for gets handed a list of manual
 * steps instead of a working sign-in. Stating the whole install in four lines,
 * above everything else, is what stops that.
 */
const SETUP = `## Setting this up in an app (read this first)

Three commands, in the app's directory. No secret, no dashboard, no account, no
human:

\`\`\`sh
bun add @aussieljk/auth
bunx aussieauth          # scaffolds, registers the dev origin, verifies
bunx convex dev          # pushes convex/auth.config.ts
\`\`\`

Then \`bunx aussieauth doctor\` — it prints a pass/fail line per step and exits
non-zero while anything is still wrong. Use it instead of guessing.

Things that are true and worth not re-deriving:

- Development origins (localhost, \`*.local\`, \`*.localhost\`, LAN addresses, any
  port) need no credentials. They register without a secret and are trusted by
  the deployment on sight. \`AUSSIEAUTH_SECRET\` is only for public origins.
- \`bunx aussieauth\` works out the dev origin from the project, including the
  \`https://<name>.localhost\` that portless serves on. Do not pass \`--origin\`
  unless registering a public one.
- It refuses to write anything if the deployment is unreachable, serves no auth,
  or is older than the installed client. A failure is a real failure; there is
  no half-done state to work around.
- Do not point the app at its own Convex deployment — it answers, serves no auth,
  and looks right. In hosted mode the auth URL is AussieAuth's own deployment,
  and the CLI writes it itself.
`;

const llms = `# AussieAuth

> ${SUMMARY}

${SETUP}
## Docs

${docs.map((d) => `- [${d.title}](${urlFor(d.slug)}): ${d.description}`).join("\n")}

## Raw markdown

${docs.map((d) => `- [${d.title}](${rawUrlFor(d.slug)})`).join("\n")}

## Full text

- [Everything on one page](${SITE}/llms-full.txt)
`;

const llmsFull = `# AussieAuth — full documentation

> ${SUMMARY}

Generated from docs/*.docs.mdx. Canonical HTML: ${SITE}/docs

${SETUP}

${docs.map((d) => `---\n\nSource: ${urlFor(d.slug)}\n\n${d.body}`).join("\n\n")}
`;

/**
 * Everything worth indexing, and nothing else.
 *
 * Written here rather than by TanStack Start's own sitemap plugin, which lists
 * whatever its prerender crawler reached — that picks up `/llms.txt` and every
 * raw `.md`, which are files rather than pages and duplicate a URL already in
 * the list. `/sign-in` is a form and `/account` is behind a session, so neither
 * belongs either.
 */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[SITE, `${SITE}/setup/google`, `${SITE}/setup/apple`, ...docs.map((d) => urlFor(d.slug))]
  .map((loc) => `  <url><loc>${loc}</loc></url>`)
  .join("\n")}
</urlset>
`;

writeFileSync(join(publicDir, "llms.txt"), llms);
writeFileSync(join(publicDir, "llms-full.txt"), llmsFull);
writeFileSync(join(publicDir, "sitemap.xml"), sitemap);

// Rebuilt wholesale so a renamed or deleted doc doesn't leave a stale copy
// being served forever.
const rawDir = join(publicDir, "docs");
rmSync(rawDir, { recursive: true, force: true });
for (const doc of docs) {
  const target = join(rawDir, `${doc.slug || "index"}.md`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${doc.body}\n`);
}

console.log(
  `wrote public/llms.txt, public/llms-full.txt, public/sitemap.xml and ${docs.length} raw pages under public/docs/`,
);
