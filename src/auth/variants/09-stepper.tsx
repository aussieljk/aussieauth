import { useState } from "react";
import { Badge, Button, Card, Heading, IconButton, Text } from "frosted-ui";
import { CATEGORY_LABEL, PROVIDERS } from "../providers";
import { MethodForm } from "../MethodForm";

/**
 * Variant 9 — a carousel. Exactly one method fills the frame, which keeps the
 * decision small; the dot rail underneath is the only hint that fifteen others
 * exist. Good for onboarding, bad for power users.
 */
export default function Stepper() {
  const [index, setIndex] = useState(0);
  const provider = PROVIDERS[index];
  const move = (delta: number) =>
    setIndex((i) => (i + delta + PROVIDERS.length) % PROVIDERS.length);

  return (
    <div className="flex justify-center">
      <div className="flex w-[520px] flex-col gap-4">
        <Card size="4">
          <div className="flex min-h-[400px] flex-col gap-5">
            <div className="flex items-center justify-between">
              <Badge size="1" color="gray">
                {CATEGORY_LABEL[provider.category]}
              </Badge>
              <Text size="1" color="gray">
                {index + 1} of {PROVIDERS.length}
              </Text>
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-5)] bg-[var(--gray-a3)]">
                <provider.Logo size={34} />
              </span>
              <Heading size="6">{provider.label}</Heading>
              <Text size="2" color="gray" className="max-w-[320px]">
                {provider.hint}
              </Text>
            </div>

            <div className="mt-auto">
              <MethodForm provider={provider} size="3" />
            </div>
          </div>
        </Card>

        {/* Nav rail */}
        <div className="flex items-center gap-3">
          <IconButton
            variant="soft"
            color="gray"
            size="2"
            aria-label="Previous method"
            onClick={() => move(-1)}
          >
            ←
          </IconButton>

          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            {PROVIDERS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={p.label}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-[var(--accent-9)]"
                    : "w-2 bg-[var(--gray-a6)] hover:bg-[var(--gray-a8)]"
                }`}
              />
            ))}
          </div>

          <IconButton
            variant="soft"
            color="gray"
            size="2"
            aria-label="Next method"
            onClick={() => move(1)}
          >
            →
          </IconButton>
        </div>

        <div className="flex justify-center">
          <Button variant="ghost" color="gray" size="1" onClick={() => setIndex(0)}>
            Back to the start
          </Button>
        </div>
      </div>
    </div>
  );
}
