import { useState } from "react";
import { Card, Heading, SegmentedControl, Tabs, Text } from "frosted-ui";
import {
  byCategory,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type ProviderCategory,
} from "../providers";
import { MethodForm } from "../MethodForm";

/**
 * One category's methods: a segmented control picks the method, the form below
 * swaps to match. Categories with a single method skip the control entirely.
 */
function CategoryPanel({ category }: { category: ProviderCategory }) {
  const methods = byCategory(category);
  const [active, setActive] = useState(methods[0].id);
  const provider = methods.find((m) => m.id === active) ?? methods[0];

  return (
    <div className="flex flex-col gap-4 pt-4">
      {methods.length > 1 && (
        <SegmentedControl.Root value={active} onValueChange={(v) => setActive(String(v))}>
          <SegmentedControl.List>
            {methods.map((m) => (
              <SegmentedControl.Trigger key={m.id} value={m.id}>
                <span className="flex items-center gap-1.5">
                  <m.Logo size={14} />
                  {m.short}
                </span>
              </SegmentedControl.Trigger>
            ))}
          </SegmentedControl.List>
        </SegmentedControl.Root>
      )}

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-3)] bg-[var(--gray-a3)]">
          <provider.Logo size={19} />
        </span>
        <div className="flex flex-col">
          <Text size="2" weight="medium">
            {provider.label}
          </Text>
          <Text size="1" color="gray">
            {provider.hint}
          </Text>
        </div>
      </div>

      <MethodForm provider={provider} size="3" />
    </div>
  );
}

/**
 * Variant 3 — two levels of tabs. The top row sorts sixteen methods into six
 * families so the user picks a *kind* of login first, then the specific one.
 */
export default function CategoryTabs() {
  return (
    <div className="flex justify-center">
      <Card size="4" className="w-[480px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Heading size="6">Sign in</Heading>
            <Text size="2" color="gray">
              Pick how you'd like to authenticate.
            </Text>
          </div>

          <Tabs.Root defaultValue="social">
            <Tabs.List>
              {CATEGORY_ORDER.map((c) => (
                <Tabs.Trigger key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {CATEGORY_ORDER.map((c) => (
              <Tabs.Content key={c} value={c}>
                <CategoryPanel category={c} />
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
      </Card>
    </div>
  );
}
