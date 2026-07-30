import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The docs' deployment field substitutes the reader's deployment name into
 * every code block, and it does that by rewriting DOM text nodes. That works
 * only while the placeholder survives syntax highlighting as a single token.
 *
 * Inside a shell fence it doesn't: shiki highlights those with a shell grammar,
 * which reads `<` as a redirection and splits `<deployment>` across five spans.
 * None of them contains the placeholder, so the substitution finds nothing and
 * does nothing — silently, on a page that still looks right.
 *
 * `your-deployment` is one shell word and stays one token. This is the seatbelt
 * for writing the other spelling by habit.
 */

const markdown = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return markdown(full);
      return entry.name.endsWith(".md") ? [full] : [];
    }),
  );
  return found.flat();
};

const SHELL_FENCE = /```(?:sh|bash|shell|zsh|console)\n([\s\S]*?)```/g;

describe("docs placeholders", () => {
  it("never put an angle-bracket deployment placeholder in a shell fence", async () => {
    const offenders: string[] = [];

    for (const file of await markdown("docs")) {
      const source = await readFile(file, "utf8");
      for (const fence of source.matchAll(SHELL_FENCE)) {
        for (const line of fence[1].split("\n")) {
          if (line.includes("<deployment>")) offenders.push(`${file}: ${line.trim()}`);
        }
      }
    }

    expect(
      offenders,
      "use `your-deployment` in shell blocks — see src/docs/Deployment.tsx",
    ).toEqual([]);
  });

  it("still has placeholders to substitute, so a silent no-op is caught too", async () => {
    // Guards the other direction: this whole test passes trivially if the docs
    // stop using placeholders at all, which would also mean the field does
    // nothing.
    const sources = await Promise.all(
      (await markdown("docs")).map((file) => readFile(file, "utf8")),
    );
    const total = sources.join("\n").match(/<deployment>|your-deployment/g) ?? [];
    expect(total.length).toBeGreaterThan(0);
  });
});
