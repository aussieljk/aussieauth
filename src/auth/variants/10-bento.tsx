import { Badge, Button, Card, Heading, Text } from "frosted-ui";
import { byCategory, byId, ctaFor, type Provider } from "../providers";
import { MethodFields } from "../MethodForm";

function Tile({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col rounded-[var(--radius-4)] border border-[var(--gray-a5)] bg-[var(--color-panel-solid)] p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function ChipRow({ providers }: { providers: Provider[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          title={p.label}
          className="flex items-center gap-1.5 rounded-full bg-[var(--gray-a3)] px-2.5 py-1 transition-colors hover:bg-[var(--gray-a5)]"
        >
          <p.Logo size={13} />
          <Text size="1">{p.short}</Text>
        </button>
      ))}
    </div>
  );
}

/**
 * Variant 10 — a bento board. Tile size encodes recommendation strength, so the
 * layout itself steers people toward passkeys without hiding anything else.
 */
export default function Bento() {
  const passkey = byId("passkey");
  const email = byId("email-password");
  const solana = byId("solana");
  const agent = byId("agent");

  return (
    <div className="mx-auto w-[760px]">
      <Card size="4">
        <div className="flex flex-col gap-5">
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <Heading size="6">Sign in to AussieAuth</Heading>
              <Text size="2" color="gray">
                Sixteen methods, sorted by how much we recommend them.
              </Text>
            </div>
            <Badge color="jade" size="2">
              Passkeys recommended
            </Badge>
          </div>

          <div className="grid grid-cols-4 grid-rows-[auto_auto_auto] gap-3">
            {/* Hero: passkey */}
            <Tile className="col-span-2 row-span-2 justify-between gap-4 bg-gradient-to-br from-[var(--accent-a3)] to-transparent">
              <div className="flex flex-col gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-3)] bg-[var(--accent-a4)]">
                  <passkey.Logo size={26} />
                </span>
                <div className="flex flex-col gap-1">
                  <Heading size="5">{passkey.label}</Heading>
                  <Text size="2" color="gray">
                    {passkey.hint} Nothing to remember, nothing to phish.
                  </Text>
                </div>
              </div>
              <Button variant="classic" size="3">
                <passkey.Logo size={16} />
                {ctaFor(passkey)}
              </Button>
            </Tile>

            {/* Social */}
            <Tile className="col-span-2 gap-3">
              <Text size="1" color="gray" weight="medium">
                SOCIAL
              </Text>
              <div className="grid grid-cols-2 gap-2">
                {byCategory("social").map((p) => (
                  <Button
                    key={p.id}
                    variant="surface"
                    size="2"
                    className="justify-start gap-2"
                  >
                    <p.Logo size={15} />
                    <Text size="1" className="truncate">
                      {p.short}
                    </Text>
                  </Button>
                ))}
              </div>
            </Tile>

            {/* Passwordless tail */}
            <Tile className="col-span-2 gap-2">
              <Text size="1" color="gray" weight="medium">
                PASSWORDLESS
              </Text>
              <ChipRow
                providers={byCategory("passwordless").filter(
                  (p) => p.id !== "passkey",
                )}
              />
            </Tile>

            {/* Email + password form */}
            <Tile className="col-span-2 gap-3">
              <div className="flex items-center gap-2">
                <email.Logo size={15} />
                <Text size="1" color="gray" weight="medium">
                  EMAIL & PASSWORD
                </Text>
              </div>
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <MethodFields provider={email} />
                <Button type="submit" variant="soft" size="2">
                  Sign in
                </Button>
              </form>
            </Tile>

            {/* Other credential pairs */}
            <Tile className="gap-2">
              <Text size="1" color="gray" weight="medium">
                OTHER CREDENTIALS
              </Text>
              <ChipRow
                providers={byCategory("password").filter(
                  (p) => p.id !== "email-password",
                )}
              />
            </Tile>

            {/* No-account options */}
            <Tile className="gap-2">
              <Text size="1" color="gray" weight="medium">
                NO ACCOUNT
              </Text>
              <ChipRow providers={byCategory("instant")} />
            </Tile>

            {/* Wallet + agent */}
            <Tile className="col-span-4 flex-row items-center gap-4">
              <div className="flex flex-1 items-center gap-3">
                <solana.Logo size={22} />
                <div className="flex flex-col">
                  <Text size="2" weight="medium">
                    {solana.label}
                  </Text>
                  <Text size="1" color="gray">
                    {solana.hint}
                  </Text>
                </div>
              </div>
              <div className="h-8 w-px bg-[var(--gray-a5)]" />
              <div className="flex flex-1 items-center gap-3">
                <agent.Logo size={22} />
                <div className="flex flex-col">
                  <Text size="2" weight="medium">
                    {agent.label}
                  </Text>
                  <Text size="1" color="gray">
                    {agent.hint}
                  </Text>
                </div>
              </div>
            </Tile>
          </div>
        </div>
      </Card>
    </div>
  );
}
