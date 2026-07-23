/**
 * The two checks standing between a stranger and the trusted-origin list.
 *
 * Kept apart from `http.ts` so they can be tested without instantiating Better
 * Auth — they're the security boundary for app registration, so they're the
 * part most worth pinning down.
 */

/**
 * Compare without leaking where two strings diverge. Length is compared first
 * and does leak, which is fine — the secret's length isn't the secret.
 */
export const secretMatches = (given: string, expected: string) => {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
};

/** A bare origin: scheme and host, no path, no trailing slash. */
export const isOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return url.origin === value && /^https?:$/.test(url.protocol);
  } catch {
    return false;
  }
};

/**
 * A native app's deep-link scheme, claimed as an origin — `aussieauthios://`,
 * or `exp://` for a project running inside Expo Go.
 *
 * These can't go through `isOrigin`: a non-special scheme has no host, so
 * `new URL("aussieauthios://").origin` is the string `"null"` and the bare
 * scheme never round-trips. Matched by pattern instead, following RFC 3986's
 * scheme grammar.
 *
 * Only the bare scheme is accepted, never a full deep link, because this is a
 * *prefix* — `resolveApp` matches any request origin starting with it, which is
 * what makes Expo Go work at all (its origin carries a LAN address that changes
 * with the network: `exp://192.168.1.5:8081/--/`). Allowing a path here would
 * register a prefix that silently claims more than it looks like it does.
 */
export const isSchemeOrigin = (value: string) =>
  /^[a-z][a-z0-9+.-]*:\/\/$/.test(value) && !/^https?:\/\/$/.test(value);

export type Registration = {
  slug: string;
  name: string;
  origins: string[];
  methods?: string[];
};

/** `req.json()` is `unknown`; narrow every field before it reaches the db. */
export const parseRegistration = (
  body: unknown,
): { app: Registration } | { error: string } => {
  if (typeof body !== "object" || body === null) {
    return { error: "Expected a JSON object" };
  }
  const { slug, name, origins, methods } = body as Record<string, unknown>;

  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,38}$/.test(slug)) {
    return { error: "slug must be lowercase letters, digits and dashes" };
  }
  if (typeof name !== "string" || !name.trim()) {
    return { error: "name is required" };
  }
  if (
    !Array.isArray(origins) ||
    origins.length === 0 ||
    !origins.every(
      (o): o is string =>
        typeof o === "string" && (isOrigin(o) || isSchemeOrigin(o)),
    )
  ) {
    return {
      error:
        "origins must be a non-empty array of bare http(s) origins (e.g. https://myapp.com) or app schemes (e.g. myapp://)",
    };
  }
  if (
    methods !== undefined &&
    (!Array.isArray(methods) ||
      !methods.every((m): m is string => typeof m === "string"))
  ) {
    return { error: "methods must be an array of method ids" };
  }

  return {
    app: {
      slug,
      name: name.trim(),
      origins: [...new Set(origins)],
      methods: methods as string[] | undefined,
    },
  };
};
