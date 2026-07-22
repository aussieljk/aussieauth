import { useState } from "react";
import { Badge, Button, ScrollArea, Text, Theme } from "frosted-ui";
import { PROVIDERS } from "./auth/providers";
import { VARIANTS } from "./auth/variants";

/**
 * Mock gallery. Ten alternative layouts for the same sixteen auth methods —
 * pick one on the left, it renders on the right. No network calls anywhere.
 */
export default function App() {
  const [activeId, setActiveId] = useState(VARIANTS[0].id);
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const variant = VARIANTS.find((v) => v.id === activeId) ?? VARIANTS[0];

  return (
    <Theme appearance={appearance} accentColor="indigo" grayColor="slate">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[var(--gray-a5)] bg-[var(--gray-a2)]">
          <div className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <Text size="3" weight="bold">
                AussieAuth
              </Text>
              <Button
                variant="soft"
                color="gray"
                size="1"
                onClick={() =>
                  setAppearance(appearance === "light" ? "dark" : "light")
                }
              >
                {appearance === "light" ? "Dark" : "Light"}
              </Button>
            </div>
            <Text size="1" color="gray">
              {VARIANTS.length} mock layouts · {PROVIDERS.length} methods
            </Text>
          </div>

          <ScrollArea type="auto" className="flex-1">
            <nav className="flex flex-col gap-1 p-2">
              {VARIANTS.map((v, i) => {
                const active = v.id === activeId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveId(v.id)}
                    className={`flex flex-col gap-0.5 rounded-[var(--radius-3)] px-3 py-2 text-left transition-colors ${
                      active
                        ? "bg-[var(--accent-a4)]"
                        : "hover:bg-[var(--gray-a3)]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Text size="1" color="gray" className="font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </Text>
                      <Text size="2" weight={active ? "bold" : "medium"}>
                        {v.name}
                      </Text>
                    </span>
                    <Text size="1" color="gray" className="leading-snug">
                      {v.tagline}
                    </Text>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t border-[var(--gray-a5)] p-3">
            <Text size="1" color="gray">
              Logos from svgl.app · UI from frosted-ui
            </Text>
          </div>
        </aside>

        {/* Stage */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-[var(--gray-a5)] px-6 py-3">
            <Text size="2" weight="bold">
              {variant.name}
            </Text>
            <Badge size="1" color="gray">
              mock
            </Badge>
            <Text size="1" color="gray" className="truncate">
              {variant.tagline}
            </Text>
          </header>

          <ScrollArea type="auto" className="flex-1">
            <div className="p-10">
              <variant.Component />
            </div>
          </ScrollArea>
        </main>
      </div>
    </Theme>
  );
}
