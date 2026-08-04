import type { ComponentType } from "react";

/**
 * The docs, read off disk at build time.
 *
 * `docs/*.docs.mdx` is the source of truth for the site, for `/llms.txt`, for
 * the raw markdown served at `/docs/<slug>.md` — and for uaight, which globs
 * `**\/*.docs.mdx` and lists every page in the explorer beside the fixtures.
 * One set of files behind all four, so a page can't say one thing to a reader,
 * another to a crawler and a third to whoever is editing the components it
 * documents.
 */

export type DocFrontmatter = {
  title: string;
  description: string;
  /** Position in the sidebar and in llms-full.txt. */
  order: number;
};

export type Doc = DocFrontmatter & {
  /** URL path after `/docs/`; `index.md` becomes the empty string. */
  slug: string;
  Content: ComponentType;
};

type DocModule = { default: ComponentType; frontmatter: DocFrontmatter };

const modules = import.meta.glob<DocModule>("../../docs/**/*.docs.mdx", {
  eager: true,
});

const slugOf = (filePath: string) =>
  filePath
    .replace("../../docs/", "")
    .replace(/\.docs\.mdx$/, "")
    .replace(/(^|\/)index$/, "");

export const DOCS: Doc[] = Object.entries(modules)
  .map(([filePath, mod]) => ({
    ...mod.frontmatter,
    slug: slugOf(filePath),
    Content: mod.default,
  }))
  .sort((a, b) => a.order - b.order);

export const docBySlug = (slug: string): Doc | undefined => DOCS.find((d) => d.slug === slug);
