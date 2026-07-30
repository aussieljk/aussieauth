import { Link as UiLink } from "ljkui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A link to a doc page by slug. Rendered through ljkui's `Link` so the
 * underline styling is a component concern, not a className at each call site.
 *
 * The docs live under one splat route, so `to="/docs/quickstart"` isn't a path
 * the router knows — it's `/docs/$` with a `_splat`. This keeps that detail in
 * one place instead of at every call site.
 */
export function DocLink({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  const link = slug ? (
    <Link to="/docs/$" params={{ _splat: slug }} className={className} />
  ) : (
    <Link to="/docs" className={className} />
  );
  return <UiLink render={link}>{children}</UiLink>;
}
