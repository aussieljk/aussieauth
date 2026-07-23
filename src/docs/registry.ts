import type { ComponentType } from "react";

/**
 * The docs, read off disk at build time.
 *
 * `docs/*.md` is the source of truth for the site, for `/llms.txt` and for the
 * raw markdown served at `/docs/<slug>.md` — one set of files behind all three,
 * so a page can't say one thing to a reader and another to a crawler.
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

const modules = import.meta.glob<DocModule>("../../docs/**/*.md", {
  eager: true,
});

const slugOf = (filePath: string) =>
  filePath
    .replace("../../docs/", "")
    .replace(/\.md$/, "")
    .replace(/(^|\/)index$/, "");

export const DOCS: Doc[] = Object.entries(modules)
  .map(([filePath, mod]) => ({
    ...mod.frontmatter,
    slug: slugOf(filePath),
    Content: mod.default,
  }))
  .sort((a, b) => a.order - b.order);

export const docBySlug = (slug: string): Doc | undefined => DOCS.find((d) => d.slug === slug);
