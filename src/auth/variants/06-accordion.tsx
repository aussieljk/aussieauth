import { Accordion, Card, Heading, Text } from "frosted-ui";
import {
  byCategory,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type ProviderCategory,
} from "../providers";
import { MethodForm } from "../MethodForm";

function CategorySection({
  category,
  openFirst,
}: {
  category: ProviderCategory;
  openFirst?: boolean;
}) {
  const methods = byCategory(category);

  return (
    <div className="flex flex-col gap-1.5">
      <Text size="1" color="gray" weight="medium" className="uppercase tracking-wide">
        {CATEGORY_LABEL[category]}
      </Text>
      <Accordion.Root
        multiple={false}
        defaultValue={openFirst ? [methods[0].id] : []}
      >
        {methods.map((p) => (
          <Accordion.Item key={p.id} value={p.id}>
            <Accordion.Trigger>
              <span className="flex flex-1 items-center gap-3 text-left">
                <p.Logo size={18} />
                <span className="flex min-w-0 flex-col">
                  <Text size="2" weight="medium">
                    {p.label}
                  </Text>
                  <Text size="1" color="gray" className="truncate">
                    {p.hint}
                  </Text>
                </span>
              </span>
            </Accordion.Trigger>
            <Accordion.Content>
              <div className="px-1 pb-3 pt-1">
                <MethodForm provider={p} />
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}

/**
 * Variant 6 — progressive disclosure. Nothing is hidden behind a "more" link;
 * every method is on screen as a collapsed row and expands in place.
 */
export default function AccordionAuth() {
  return (
    <div className="flex justify-center">
      <Card size="3" className="w-[460px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <Heading size="6">Choose a sign-in method</Heading>
            <Text size="2" color="gray">
              Expand any row to fill it in.
            </Text>
          </div>

          <div className="flex flex-col gap-4">
            {CATEGORY_ORDER.map((c, i) => (
              <CategorySection key={c} category={c} openFirst={i === 0} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
