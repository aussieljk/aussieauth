import { MDXProvider } from "@mdx-js/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Theme } from "ljkui";
import type { ReactNode } from "react";
// The app's stylesheet. uaight runs the preview entry inside the frame realm,
// which is the only place a fixture's CSS can land.
import "./index.css";
// Resolves `Icons.Trash` and friends the way `main.tsx` does for the app.
import "ljkui/icons/lucide";
// Configures the package's `authClient` live binding, exactly as the app's
// entry does. Components import `authClient` from `@aussieljk/auth` directly,
// so without this every card fixture throws "AussieAuth has no client yet" on
// mount — a side-effect import, evaluated before anything renders.
import "./lib/auth";

/**
 * Everything the app mounts above a screen, wrapped around every fixture and
 * every docs page. Fixtures never reach a real deployment, so `useQuery` stays
 * `undefined` — the same pre-settle state the app renders before Convex
 * answers.
 *
 * uaight loads this through `previewEntry` in `vite.config.ts`; the component
 * tests import it directly, so a test and the explorer are looking at the same
 * component in the same providers.
 */
const convex = new ConvexReactClient("http://127.0.0.1:9");

/**
 * A docs page is the whole fixture, so nothing else is around to style it. On
 * the site that job belongs to the `<article className="prose">` the route
 * draws; here it rides in through MDX's own provider, which reaches compiled
 * `.docs.mdx` modules and nothing else.
 */
const mdxComponents = {
  wrapper: ({ children }: { children?: ReactNode }) => (
    <article className="prose mx-auto max-w-3xl">{children}</article>
  ),
};

export function Preview({ children }: { children: ReactNode }) {
  return (
    // The theme `App` mounts, so ljkui tokens like `--gray-11` resolve.
    <Theme appearance="dark" accentColor="green" grayColor="neutral">
      <ConvexProvider client={convex}>
        <MDXProvider components={mdxComponents}>{children}</MDXProvider>
      </ConvexProvider>
    </Theme>
  );
}

export default Preview;
