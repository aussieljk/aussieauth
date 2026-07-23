import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A link to a doc page by slug.
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
  if (!slug) {
    return (
      <Link to="/docs" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/docs/$" params={{ _splat: slug }} className={className}>
      {children}
    </Link>
  );
}
