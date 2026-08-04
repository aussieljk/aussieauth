import { Theme } from "ljkui";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import "ljkui/styles.css";
// Registers the library `Icons.Trash` and friends resolve through. Without an
// adapter every canonical icon renders as nothing.
import "ljkui/icons/lucide";
import "../index.css";
import { ErrorBoundary } from "../ErrorBoundary";

const SITE = "https://aussieauth.com";
const DESCRIPTION = "An auth server with fifteen sign-in methods and no consent screen of its own.";

/**
 * Every auth call in the app goes to this origin. Naming it here lets the
 * browser finish DNS and the TLS handshake while React is still hydrating,
 * instead of paying for both on the first request after a click.
 */
const CONVEX_SITE = import.meta.env.VITE_CONVEX_SITE_URL;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Paints form controls and the pre-hydration canvas dark, so there's no
      // white flash before React mounts.
      { name: "color-scheme", content: "dark" },
      { title: "AussieAuth — one auth server, fifteen ways in" },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "AussieAuth" },
      { property: "og:url", content: SITE },
      { property: "og:title", content: "AussieAuth" },
      { property: "og:description", content: DESCRIPTION },
      // Absolute, because scrapers don't resolve relative URLs.
      { property: "og:image", content: `${SITE}/opengraph-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "AussieAuth" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AussieAuth" },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: `${SITE}/opengraph-image.png` },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
      ...(CONVEX_SITE
        ? [
            // `use-credentials`, not anonymous: Better Auth's client sends
            // `credentials: "include"` on every call, and a browser won't reuse
            // an anonymous connection for a credentialed request — the warmed
            // socket would be thrown away and the handshake paid twice.
            {
              rel: "preconnect",
              href: CONVEX_SITE,
              crossOrigin: "use-credentials" as const,
            },
            { rel: "dns-prefetch", href: CONVEX_SITE },
          ]
        : []),
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ErrorBoundary>
          <Theme appearance="dark" accentColor="green" grayColor="neutral">
            <Outlet />
          </Theme>
        </ErrorBoundary>
        <Scripts />
      </body>
    </html>
  );
}
