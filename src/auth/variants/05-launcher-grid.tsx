import { useState } from "react";
import { Badge, Dialog, Heading, Text } from "frosted-ui";
import { PROVIDERS, type Provider } from "../providers";
import { MethodForm } from "../MethodForm";

/**
 * Variant 5 — an app-launcher grid. Every method gets equal billing as a tile;
 * picking one opens a focused dialog rather than pushing the grid around.
 */
export default function LauncherGrid() {
  const [selected, setSelected] = useState<Provider | null>(null);

  return (
    <div className="mx-auto flex w-[720px] flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <Heading size="7">How do you want to sign in?</Heading>
        <Text size="2" color="gray">
          {PROVIDERS.length} ways in. Pick whichever you already have.
        </Text>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p)}
            className="group flex flex-col items-center gap-2.5 rounded-[var(--radius-4)] border border-[var(--gray-a5)] bg-[var(--color-panel-solid)] px-3 py-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent-8)] hover:shadow-lg"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-3)] bg-[var(--gray-a3)] transition-colors group-hover:bg-[var(--accent-a3)]">
              <p.Logo size={24} />
            </span>
            <Text size="2" weight="medium" className="text-center">
              {p.short}
            </Text>
            <Badge size="1" color="gray" variant="soft">
              {p.category}
            </Badge>
          </button>
        ))}
      </div>

      <Text size="1" color="gray" className="text-center">
        Mock UI — no credentials leave this page.
      </Text>

      <Dialog.Root
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Content className="max-w-[420px]">
          {selected && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-3)] bg-[var(--gray-a3)]">
                  <selected.Logo size={22} />
                </span>
                <div className="flex flex-col">
                  <Dialog.Title>{selected.label}</Dialog.Title>
                  <Dialog.Description>{selected.hint}</Dialog.Description>
                </div>
              </div>
              <MethodForm provider={selected} size="3" />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
