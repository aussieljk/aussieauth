import { Typography } from "@aussieljk/frosted";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

const { Text } = Typography;

/**
 * Header and footer for the pages anyone can read. The sign-in card and the
 * account page deliberately don't use it — both are single-purpose screens, and
 * a nav bar on them is just somewhere else to click mid-sign-in.
 */
export function Chrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-[var(--gray-a4)] bg-[var(--gray-1)]/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <img src="/logo.svg" alt="" width={22} height={22} />
            AussieAuth
          </Link>
          <div className="flex flex-1 items-center gap-5 text-[14px]">
            <NavLink to="/docs">Docs</NavLink>
            <NavLink to="/setup/google">Google setup</NavLink>
            <NavLink to="/setup/apple">Apple setup</NavLink>
          </div>
          <NavLink to="/sign-in">Sign in →</NavLink>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-[var(--gray-a4)]">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <Text color="gray">
            Your apps talk to this server directly — no AussieAuth consent screen, ever.
          </Text>
          <div className="flex gap-4 text-[13px]">
            <a href="/llms.txt" className="text-[var(--gray-11)] underline">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="text-[var(--gray-11)] underline">
              sitemap
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** `to` is the router's own union, so a typo'd nav link is a type error. */
function NavLink({ to, children }: { to: LinkProps["to"]; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-[var(--gray-11)] transition-colors hover:text-[var(--gray-12)]"
      activeProps={{ className: "!text-[var(--gray-12)]" }}
    >
      {children}
    </Link>
  );
}
