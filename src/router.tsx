import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // Fetch a route's chunk when the pointer lands on its link. The sign-in
    // route pulls in the whole Better Auth client — fourteen plugins — so
    // starting that download on hover is most of the gap between clicking
    // "Sign in" and seeing the card.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
