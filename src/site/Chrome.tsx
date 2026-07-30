import { Link } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

/**
 * A single header for the pages anyone can read. The sign-in card and the
 * account page deliberately don't use it — both are single-purpose screens.
 */
export function Chrome({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  const rowInner = bleed
    ? "w-full lg:w-1/2 mx-auto max-w-md px-6"
    : "mx-auto w-full max-w-5xl px-6";
  // Measuring the header's real height keeps the sticky offset of the landing's
  // split-screen card correct under zoom and late font loads. Exposed as
  // `--header-h` for descendants to reference in `top`/`height` calc.
  const headerRef = useRef<HTMLElement>(null);
  const [headerH, setHeaderH] = useState(57);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen flex-col" style={{ "--header-h": `${headerH}px` } as CSSProperties}>
      <header
        ref={headerRef}
        className="sticky top-0 z-10 border-b border-[var(--gray-a4)] bg-[var(--gray-1)]/80 backdrop-blur"
      >
        <nav className={`${rowInner} flex items-center justify-between gap-6 py-3`}>
          <Link to="/" className="flex items-center gap-2 font-medium">
            <img src="/logo.svg" alt="" width={20} height={20} />
            AussieAuth
          </Link>
          <Link
            to="/docs"
            className="text-[14px] text-[var(--gray-11)] transition-colors hover:text-[var(--gray-12)]"
          >
            Docs
          </Link>
        </nav>
      </header>

      <main className={bleed ? "w-full flex-1" : "mx-auto w-full max-w-5xl flex-1 px-6 py-10"}>
        {children}
      </main>
    </div>
  );
}
