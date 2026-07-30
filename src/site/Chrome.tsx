import { Typography } from "ljkui";
import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

const { Text } = Typography;

/**
 * A single header for the pages anyone can read. The sign-in card and the
 * account page deliberately don't use it — both are single-purpose screens.
 *
 * The header is a fixed `h-14` (3.5rem) so the landing's split-screen card can
 * pin itself with plain `top-14` / `calc(100vh-3.5rem)` layout classes — no
 * runtime measurement, no CSS variable.
 */
export function Chrome({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  const rowInner = bleed
    ? "w-full lg:w-1/2 mx-auto max-w-md px-6"
    : "mx-auto w-full max-w-5xl px-6";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10">
        <nav className={`${rowInner} flex h-14 items-center justify-between gap-6`}>
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="" width={20} height={20} />
            <Text weight="medium">AussieAuth</Text>
          </Link>
          <Link to="/docs">
            <Text size="2" color="gray">
              Docs
            </Text>
          </Link>
        </nav>
      </header>

      <main className={bleed ? "w-full flex-1" : "mx-auto w-full max-w-5xl flex-1 px-6 py-10"}>
        {children}
      </main>
    </div>
  );
}
