/// <reference types="vite/client" />
/// <reference types="mdx" />

declare module "*.md" {
  import type { ComponentType } from "react";
  /** Injected by `remark-mdx-frontmatter`; see `vite.base.ts`. */
  export const frontmatter: {
    title: string;
    description: string;
    order: number;
  };
  const MDXComponent: ComponentType;
  export default MDXComponent;
}

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  readonly VITE_CONVEX_SITE_URL: string;
  /** Only set when Google One Tap is configured. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
