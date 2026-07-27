/// <reference types="vitest/config" />
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";
import { base } from "./vite.base";

// Vitest drives this same config file, and the Start plugin has nothing to do
// under it: route generation and the SSR entry are build concerns, while the
// component tests render fixtures directly. Leaving it in makes the browser
// project fail to boot.
const underVitest = Boolean(process.env.VITEST);

// https://vite.dev/config/
export default defineConfig({
  ...base,
  plugins: [
    ...(underVitest
      ? []
      : [
          tanstackStart({
            // Emit real HTML for every route we can resolve at build time. The
            // marketing and docs pages exist to be read by crawlers that don't
            // run JavaScript, so a client-rendered shell would defeat them.
            //
            // Prerendering *everything* is also what lets `dist/client` deploy
            // as plain static files — see `vercel.json`. Nothing here needs a
            // server at request time.
            prerender: {
              enabled: true,
              crawlLinks: true,
              failOnError: true,
              // The docs link to their own raw markdown, to `/llms.txt` and to
              // the sitemap. Those are real files in `public/`, not routes, and
              // the crawler would otherwise try to render each one as a page.
              filter: ({ path }) => !/\.[a-z0-9]+$/i.test(path),
            },
            // Sitemap is written by `scripts/generate-llms.ts` instead. The
            // built-in one lists whatever the crawler reached, which here means
            // `/llms.txt` and every raw `.md` — files, not pages, and each one
            // a duplicate of a URL already in there.
            sitemap: { enabled: false },
            pages: [
              // Prerendered so a hard refresh works, but there is nothing on
              // any of them that a search engine should hold: one is a form,
              // the others are behind a session.
              { path: "/sign-in", sitemap: { exclude: true } },
              { path: "/account", sitemap: { exclude: true } },
              { path: "/admin", sitemap: { exclude: true } },
            ],
          }),
        ]),
    ...base.plugins,
  ],
  test: {
    projects: [
      {
        // The security-critical logic that has no UI: signature verification,
        // the demo lockdown's path matcher, account-number handling. Plain
        // node, no browser — these are the tests worth running on every save.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["convex/**/*.test.ts", "src/**/*.test.ts"],
        },
      },
      {
        // The components, driven in a real browser through the same fixtures
        // `bun run cosmos` renders. `.tsx` is the whole selector: anything that
        // needs a DOM is JSX, anything that doesn't is `.ts` and runs above.
        extends: true,
        test: {
          name: "component",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/testing/setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
      // Whole flows against a *running* site and a *real* deployment — see
      // e2e/flows.test.ts for what it needs. Registered only when E2E is set,
      // so `bun run test` and CI never trip over a server that isn't there.
      ...(process.env.E2E
        ? [
            {
              extends: true as const,
              test: {
                name: "e2e",
                environment: "node",
                include: ["e2e/**/*.test.ts"],
                testTimeout: 120_000,
                hookTimeout: 60_000,
              },
            },
          ]
        : []),
    ],
  },
});
