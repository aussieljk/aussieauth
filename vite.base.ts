import mdx from "@mdx-js/rollup";
import shiki from "@shikijs/rehype";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import type { UserConfig } from "vite";

/**
 * Everything that isn't TanStack Start.
 *
 * Three tools build this app — vite, vitest and react-cosmos — and only the
 * first wants Start's route generation and SSR entry. Keeping the shared half
 * here means the aliases can't drift between them, which is the failure that
 * shows up as a module resolving in the app and not in a fixture.
 */
export const base = {
  plugins: [
    // Before `react()`, which is the rule for any plugin that produces JSX.
    {
      // Docs compile to React at build time, so no markdown parser and no
      // syntax highlighter reach the browser — the pages are already HTML by
      // the time anyone asks for them.
      ...mdx({
        // CommonMark, not MDX. The docs are prose written by hand, and under
        // MDX every stray `<` starts a component — `https://<deployment>.…`
        // would be a build error rather than a URL.
        format: "md",
        remarkPlugins: [
          remarkGfm,
          remarkFrontmatter,
          // Re-exports the YAML block as `frontmatter`, which is how the route
          // and the llms.txt generator read a page's title and description.
          [remarkMdxFrontmatter, { name: "frontmatter" }],
        ],
        rehypePlugins: [[shiki, { theme: "github-dark-default" }]],
      }),
      enforce: "pre",
    },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@/convex": path.resolve(import.meta.dirname, "./convex"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
} satisfies UserConfig;
