import { Badge, Button, Card, FilterChip, HStack, Input, Spacer, Typography } from "ljkui";
import { AussieAuthSignIn, PROVIDERS } from "@aussieljk/auth";
import { useMemo, useState } from "react";

const { Code, Heading, Text } = Typography;

/**
 * The card, configured by clicking, printing the JSX for whatever is on
 * screen.
 *
 * `<AussieAuthSignIn>` takes `featured`, `primary`, `methods` and
 * `accentColor`, and the only way to find out what a combination looks like
 * was to write it, build, and look. With fifteen methods the space is far
 * larger than a docs page can show points in, so this shows the space instead
 * of a handful of samples.
 *
 * It doubles as the honest answer to "what does this actually look like",
 * which is the first question anyone choosing an auth provider asks.
 */

const ACCENTS = ["green", "indigo", "violet", "crimson", "amber", "cyan", "gray"] as const;

type Accent = (typeof ACCENTS)[number];
type Appearance = "light" | "dark";

/** Add or remove `id`, whichever the list doesn't already say. */
const toggle = (list: string[], set: (next: string[]) => void, id: string) =>
  set(list.includes(id) ? list.filter((m) => m !== id) : [...list, id]);

const DEFAULTS = {
  featured: ["google", "github", "apple"],
  primary: "email-password",
};

/** Only methods with a real mark make sense as a big front-of-card button. */
const FEATURABLE = PROVIDERS.filter((p) => p.Logo || p.id === "passkey").map((p) => p.id);

/** Only methods with a form or a one-click action can sit inline as `primary`. */
const PRIMARIES = PROVIDERS.filter((p) => p.id !== "agent").map((p) => p.id);

export function Playground() {
  const [methods, setMethods] = useState<string[]>(PROVIDERS.map((p) => p.id));
  const [featured, setFeatured] = useState<string[]>(DEFAULTS.featured);
  const [primary, setPrimary] = useState(DEFAULTS.primary);
  const [accentColor, setAccentColor] = useState<Accent>("green");
  const [appearance, setAppearance] = useState<Appearance>("dark");
  const [appName, setAppName] = useState("My App");

  // Only what differs from the defaults, because the point of the snippet is
  // to be pasted — a printout of every prop at its default value teaches the
  // reader that the component needs configuring when it doesn't.
  const snippet = useMemo(
    () =>
      buildSnippet({
        appName,
        methods: methods.length === PROVIDERS.length ? null : methods,
        featured,
        primary,
        accentColor,
        appearance,
      }),
    [appName, methods, featured, primary, accentColor, appearance],
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 lg:w-[420px] lg:shrink-0">
        <Card>
          <div className="flex flex-col gap-4">
            <Heading>Configure</Heading>

            <label className="flex flex-col gap-1.5">
              <Text color="gray" weight="medium">
                App name
              </Text>
              <Input.Control value={appName} onChange={(e) => setAppName(e.target.value)} />
            </label>

            <Group
              label="Featured"
              hint="Full-width buttons on the front of the card."
              options={FEATURABLE}
              selected={featured}
              onToggle={(id) => toggle(featured, setFeatured, id)}
            />

            <div className="flex flex-col gap-1.5">
              <Text color="gray" weight="medium">
                Primary
              </Text>
              <Text color="gray">The method whose form sits inline under the buttons.</Text>
              <div className="flex flex-wrap gap-1.5">
                {PRIMARIES.map((id) => (
                  <Chip key={id} active={primary === id} onClick={() => setPrimary(id)}>
                    {id}
                  </Chip>
                ))}
              </div>
            </div>

            <Group
              label="Methods"
              hint="Everything else appears under “more ways to sign in”."
              options={PROVIDERS.map((p) => p.id)}
              selected={methods}
              onToggle={(id) => toggle(methods, setMethods, id)}
              extra={
                <Button
                  size="1"
                  variant="ghost"
                  onClick={() =>
                    setMethods(
                      methods.length === PROVIDERS.length ? [] : PROVIDERS.map((p) => p.id),
                    )
                  }
                >
                  {methods.length === PROVIDERS.length ? "none" : "all"}
                </Button>
              }
            />

            <div className="flex flex-col gap-1.5">
              <Text color="gray" weight="medium">
                Accent
              </Text>
              <div className="flex flex-wrap gap-1.5">
                {ACCENTS.map((color) => (
                  <Chip
                    key={color}
                    active={accentColor === color}
                    onClick={() => setAccentColor(color)}
                  >
                    {color}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Text color="gray" weight="medium">
                Appearance
              </Text>
              <div className="flex gap-1.5">
                {(["light", "dark"] as const).map((mode) => (
                  <Chip key={mode} active={appearance === mode} onClick={() => setAppearance(mode)}>
                    {mode}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Snippet code={snippet} />
      </div>

      <Card className="min-w-0 flex-1">
        <div className="flex flex-col gap-2">
          <HStack alignment="firstTextBaseline" spacing={12}>
            <Heading>Preview</Heading>
            <Spacer />
            <Badge color="gray">live component</Badge>
          </HStack>
          {methods.length === 0 ? (
            <Text color="gray">Pick at least one method.</Text>
          ) : (
            // The card's own shell is a full-height centred screen, which is
            // right where it lives and too tall here — so the preview is a
            // window onto it rather than a resize of it.
            <div className="max-h-[760px] overflow-auto">
              {/* Keyed on everything, because the card holds which panel is open
                  in its own state — changing the method list under it would
                  otherwise leave a panel on screen for a method you just
                  removed. */}
              <AussieAuthSignIn
                key={`${methods.join()}|${featured.join()}|${primary}|${accentColor}|${appearance}`}
                appName={appName}
                methods={methods}
                featured={featured}
                primary={primary}
                accentColor={accentColor}
                appearance={appearance}
                // The preview isn't signing anyone in, and this deployment has
                // no app row for its own origin. Asking what it's allowed to do
                // would narrow the card to the server's answer, which is the
                // opposite of the point here.
                respectRegistration={false}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Group({
  label,
  hint,
  options,
  selected,
  onToggle,
  extra,
}: {
  label: string;
  hint: string;
  options: string[];
  selected: string[];
  onToggle: (id: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <HStack alignment="firstTextBaseline" spacing={8}>
        <Text color="gray" weight="medium">
          {label}
        </Text>
        <Spacer />
        {extra}
      </HStack>
      <Text color="gray">{hint}</Text>
      <div className="flex flex-wrap gap-1.5">
        {options.map((id) => (
          <Chip key={id} active={selected.includes(id)} onClick={() => onToggle(id)}>
            {id}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <FilterChip checked={active} onCheckedChange={() => onClick()}>
      {children}
    </FilterChip>
  );
}

/** The JSX for what's on screen, and a button that puts it on the clipboard. */
function Snippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <div className="flex flex-col gap-2">
        <HStack alignment="firstTextBaseline" spacing={12}>
          <Heading>Paste this</Heading>
          <Spacer />
          <Button
            size="1"
            variant="surface"
            onClick={() => {
              void navigator.clipboard.writeText(code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </HStack>
        <pre className="overflow-x-auto p-3">
          <Code>{code}</Code>
        </pre>
      </div>
    </Card>
  );
}

/** A string array as the JSX prop literal someone would have typed. */
const list = (values: string[]) => `{[${values.map((v) => `"${v}"`).join(", ")}]}`;

/** Formatting a props object as the JSX someone would have written by hand. */
function buildSnippet({
  appName,
  methods,
  featured,
  primary,
  accentColor,
  appearance,
}: {
  appName: string;
  methods: string[] | null;
  featured: string[];
  primary: string;
  accentColor: string;
  appearance: string;
}) {
  const props: string[] = [`appName="${appName}"`];
  if (methods) props.push(`methods=${list(methods)}`);
  if (featured.join() !== DEFAULTS.featured.join()) props.push(`featured=${list(featured)}`);
  if (primary !== DEFAULTS.primary) props.push(`primary="${primary}"`);
  if (accentColor !== "green") props.push(`accentColor="${accentColor}"`);
  if (appearance !== "dark") props.push(`appearance="${appearance}"`);

  const body =
    props.length === 1
      ? `<AussieAuthSignIn ${props[0]} />`
      : `<AussieAuthSignIn\n${props.map((p) => `  ${p}`).join("\n")}\n/>`;

  return `import { AussieAuthSignIn } from "@aussieljk/auth";\nimport "@aussieljk/auth/styles.css";\n\n${body}`;
}
