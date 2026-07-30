/**
 * Reading a build-time environment variable from inside a published package,
 * without assuming which bundler is doing the building.
 *
 * There is no portable answer here, only three partial ones:
 *
 *   - Vite exposes `import.meta.env.VITE_*` and replaces it statically at
 *     build time, including inside dependencies.
 *   - Next and Metro replace `process.env.NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`
 *     through DefinePlugin, which also reaches dependencies.
 *   - Node just has `process.env`.
 *
 * Each is guarded, because touching the wrong one is a hard error rather than
 * an undefined: `process` doesn't exist in a browser bundle that never
 * shimmed it. Every caller takes an explicit override, so this is a
 * convenience and never the only way in — a variable a bundler declined to
 * inline should cost you one prop, not an afternoon.
 */

type EnvBag = Record<string, string | undefined>;

const fromProcess = (): EnvBag => {
  const scope = globalThis as { process?: { env?: EnvBag } };
  return scope.process?.env ?? {};
};

const fromImportMeta = (): EnvBag => {
  try {
    return (import.meta as unknown as { env?: EnvBag }).env ?? {};
  } catch {
    // `import.meta` is a syntax-level thing; a CJS interop layer that rewrote
    // it into something that throws on access shouldn't take the app down.
    return {};
  }
};

/** The first of `names` that's set anywhere, or `""`. */
export const readEnv = (...names: string[]): string => {
  const bags = [fromImportMeta(), fromProcess()];
  for (const name of names) {
    for (const bag of bags) {
      const value = bag[name];
      if (value) return value;
    }
  }
  return "";
};

/**
 * Whether this is a development build, for warnings that shouldn't reach a
 * production console. Defaults to *not* development when nothing says either
 * way — a warning that only fires when we're sure is better than one that
 * fires in a user's browser.
 */
export const isDevelopment = (): boolean => {
  const mode = readEnv("MODE", "NODE_ENV");
  if (mode) return mode !== "production";
  const dev = readEnv("DEV");
  return dev === "true";
};
