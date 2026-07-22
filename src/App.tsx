import { useState } from "react";
import { Button, Text, Theme } from "frosted-ui";
import { PROVIDERS } from "./auth/providers";
import ClassicStack from "./auth/variants/classic-stack";
import Quiet from "./auth/variants/quiet";

/**
 * Both surviving auth mocks side by side, so the two treatments can be compared
 * directly. No network calls anywhere — every method is a mock.
 */
export default function App() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");

  return (
    <Theme appearance={appearance} accentColor="indigo" grayColor="slate">
      <div className="min-h-screen">
        <header className="flex items-center gap-3 border-b border-[var(--gray-a5)] px-6 py-3">
          <Text size="2" weight="bold">
            AussieAuth
          </Text>
          <Text size="1" color="gray">
            {PROVIDERS.length} methods · mock UI
          </Text>
          <Button
            variant="soft"
            color="gray"
            size="1"
            className="ml-auto"
            onClick={() =>
              setAppearance(appearance === "light" ? "dark" : "light")
            }
          >
            {appearance === "light" ? "Dark" : "Light"}
          </Button>
        </header>

        <main className="flex flex-wrap items-start justify-center gap-12 p-10">
          <section className="flex flex-col gap-3">
            <Text size="1" color="gray" weight="medium" className="uppercase tracking-wider">
              Classic
            </Text>
            <ClassicStack />
          </section>

          <section className="flex flex-col gap-3">
            <Text size="1" color="gray" weight="medium" className="uppercase tracking-wider">
              Quiet
            </Text>
            <Quiet />
          </section>
        </main>
      </div>
    </Theme>
  );
}
