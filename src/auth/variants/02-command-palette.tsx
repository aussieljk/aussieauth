import { useMemo, useState } from "react";
import { Button, Card, Kbd, ScrollArea, Separator, Text, TextField } from "frosted-ui";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  PROVIDERS,
  type Provider,
} from "../providers";
import { MethodForm } from "../MethodForm";

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <circle
        cx="11"
        cy="11"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Variant 2 — ⌘K style. One search field ranks all sixteen methods, so nothing
 * is buried behind a "more options" link; you type "pass" and get both the
 * passkey and every password method.
 */
export default function CommandPalette() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Provider | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (p: Provider) =>
      !q ||
      p.label.toLowerCase().includes(q) ||
      p.short.toLowerCase().includes(q) ||
      p.hint.toLowerCase().includes(q) ||
      CATEGORY_LABEL[p.category].toLowerCase().includes(q);

    return CATEGORY_ORDER.map((category) => ({
      category,
      items: PROVIDERS.filter((p) => p.category === category && match(p)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex justify-center">
      <Card size="1" className="w-[540px] overflow-hidden p-0">
        {selected ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3">
              <Button
                variant="ghost"
                color="gray"
                size="1"
                onClick={() => setSelected(null)}
              >
                ← Back
              </Button>
              <Separator orientation="vertical" className="h-4" />
              <selected.Logo size={16} />
              <Text size="2" weight="medium">
                {selected.label}
              </Text>
            </div>
            <Separator className="w-full" />
            <div className="p-4">
              <MethodForm provider={selected} size="3" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="px-3 py-2">
              <TextField.Root>
                <TextField.Slot>
                  <SearchIcon />
                </TextField.Slot>
                <TextField.Input
                  size="3"
                  variant="soft"
                  autoFocus
                  placeholder="Search sign-in methods…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </TextField.Root>
            </div>

            <Separator className="w-full" />

            <ScrollArea type="auto" className="h-[360px]">
              <div className="flex flex-col gap-3 p-2">
                {groups.map((group) => (
                  <div key={group.category} className="flex flex-col gap-1">
                    <Text
                      size="1"
                      color="gray"
                      weight="medium"
                      className="px-2 pt-1"
                    >
                      {CATEGORY_LABEL[group.category]}
                    </Text>
                    {group.items.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelected(p)}
                        className="group flex items-center gap-3 rounded-[var(--radius-3)] px-2 py-2 text-left hover:bg-[var(--gray-a3)]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-2)] bg-[var(--gray-a3)]">
                          <p.Logo size={17} />
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <Text size="2" weight="medium">
                            {p.label}
                          </Text>
                          <Text size="1" color="gray" className="truncate">
                            {p.hint}
                          </Text>
                        </span>
                        <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
                          <Kbd size="1">↵</Kbd>
                        </span>
                      </button>
                    ))}
                  </div>
                ))}

                {total === 0 && (
                  <div className="flex flex-col items-center gap-1 py-16">
                    <Text size="2" weight="medium">
                      No matching methods
                    </Text>
                    <Text size="1" color="gray">
                      Try “passkey”, “wallet” or “anonymous”.
                    </Text>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator className="w-full" />

            <div className="flex items-center gap-3 px-4 py-2">
              <Text size="1" color="gray" className="flex items-center gap-1">
                <Kbd size="1">↑</Kbd>
                <Kbd size="1">↓</Kbd> navigate
              </Text>
              <Text size="1" color="gray" className="flex items-center gap-1">
                <Kbd size="1">↵</Kbd> select
              </Text>
              <Text size="1" color="gray" className="ml-auto">
                {total} methods
              </Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
