import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
  type AussieAuthClient,
  type AussieAuthClientOptions,
  baseURL as moduleBaseURL,
  callbackURL as moduleCallbackURL,
  requireAuthClient,
  toCallbackResolver,
} from "./client";

/**
 * Where the package's components get their client from.
 *
 * They used to import the module-level `authClient` directly, which made three
 * things true that shouldn't have been: reading it before
 * `createAussieAuthClient()` ran gave `undefined` rather than an explanation,
 * a bundle could only ever talk to one deployment, and a server rendering two
 * requests at once shared one mutable binding between them.
 *
 * A provider fixes all three, and costs nothing to skip — with no provider
 * mounted these hooks fall back to exactly the module state they replaced, so
 * an app that already calls `createAussieAuthClient()` at its entry keeps
 * working unchanged. The Expo side has always taken its client as a prop; this
 * is the web equivalent.
 */

export type AussieAuthConfig = {
  client: AussieAuthClient;
  /** The deployment's origin, for the endpoints reached without the client. */
  baseURL: string;
  /** Where a provider should return to, resolved per call. */
  callbackURL: () => string;
};

const AussieAuthContext = createContext<AussieAuthConfig | null>(null);

export type AussieAuthClientProviderProps = {
  client: AussieAuthClient;
  children: ReactNode;
} & Partial<Pick<AussieAuthClientOptions, "baseURL" | "callbackURL">>;

/**
 * Makes `client` the one every AussieAuth component below this point uses.
 *
 * `baseURL` and `callbackURL` default to whatever the client was created with,
 * so passing them again is only for the case where one client serves two
 * surfaces that return to different places.
 */
export function AussieAuthClientProvider({
  client,
  baseURL,
  callbackURL,
  children,
}: AussieAuthClientProviderProps) {
  const value = useMemo<AussieAuthConfig>(
    () => ({
      client,
      baseURL: baseURL ?? moduleBaseURL,
      callbackURL: callbackURL === undefined ? moduleCallbackURL : toCallbackResolver(callbackURL),
    }),
    [client, baseURL, callbackURL],
  );

  return <AussieAuthContext.Provider value={value}>{children}</AussieAuthContext.Provider>;
}

/**
 * The nearest configuration, falling back to the module-level one.
 *
 * The fallback is what keeps `createAussieAuthClient()`-at-your-entry working
 * with no provider in the tree, and it explains itself when neither is set up
 * rather than handing back `undefined`.
 *
 * `client` is a getter rather than a value, and that is load-bearing: reading
 * it throws when nothing is configured, which is right when you're about to
 * sign someone in and wrong when you only wanted the base URL. A prerender
 * pass has no client — the entry that builds one runs in the browser — so a
 * config object that resolved `client` eagerly took the whole static build
 * down on any page rendering a component that merely asks where the server is.
 */
export function useAussieAuth(): AussieAuthConfig {
  const provided = useContext(AussieAuthContext);
  if (provided) return provided;
  return {
    get client() {
      return requireAuthClient();
    },
    baseURL: moduleBaseURL,
    callbackURL: moduleCallbackURL,
  };
}

/** The client to sign in with. Throws if there isn't one yet. */
export const useAuthClient = (): AussieAuthClient => useAussieAuth().client;

/** The absolute return URL to hand a provider. */
export const useCallbackURL = (): (() => string) => useAussieAuth().callbackURL;

/**
 * Where the deployment is, for the few things reached without the client.
 *
 * Separate from `useAuthClient` because it answers during a prerender, where
 * there is no client and no need for one.
 */
export const useAuthBaseURL = (): string => useAussieAuth().baseURL;
