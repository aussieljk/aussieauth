import { Badge, Button, Card, Heading, Separator, Text } from "frosted-ui";
import { byId, ctaFor, PROVIDERS } from "../providers";

const WALLETS = [
  { name: "Phantom", glyph: "👻", tint: "#AB9FF2" },
  { name: "Solflare", glyph: "🔆", tint: "#FC7227" },
  { name: "Backpack", glyph: "🎒", tint: "#E33E3F" },
];

const FALLBACK = PROVIDERS.filter(
  (p) => p.category !== "wallet" && p.category !== "machine",
);

/**
 * Variant 7 — wallet-first, for a product where the chain account *is* the
 * account. Solana takes the hero slot, agent auth sits beside it as the machine
 * equivalent, and the sixteen conventional methods collapse into a quiet rail.
 */
export default function WalletFirst() {
  const solana = byId("solana");
  const agent = byId("agent");

  return (
    <div className="flex justify-center">
      <Card size="4" className="w-[520px]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--gray-a3)]">
              <solana.Logo size={34} />
            </span>
            <Heading size="7">Connect your wallet</Heading>
            <Text size="2" color="gray">
              Sign a message to prove ownership. No password, no email, no
              custody.
            </Text>
          </div>

          {/* Detected wallets */}
          <div className="flex flex-col gap-2">
            {WALLETS.map((w, i) => (
              <button
                key={w.name}
                type="button"
                className="flex items-center gap-3 rounded-[var(--radius-4)] border border-[var(--gray-a5)] px-4 py-3 transition-colors hover:border-[var(--accent-8)] hover:bg-[var(--accent-a2)]"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-3)] text-lg"
                  style={{ backgroundColor: `${w.tint}33` }}
                >
                  {w.glyph}
                </span>
                <span className="flex flex-col text-left">
                  <Text size="2" weight="medium">
                    {w.name}
                  </Text>
                  <Text size="1" color="gray">
                    {i === 0 ? "Detected in this browser" : "Not installed"}
                  </Text>
                </span>
                {i === 0 && (
                  <Badge size="1" color="jade" className="ml-auto">
                    Ready
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <Button variant="classic" size="3" color="purple">
            <solana.Logo size={16} />
            {ctaFor(solana)}
          </Button>

          {/* Machine identity gets equal footing with human wallets. */}
          <div className="flex items-center gap-3 rounded-[var(--radius-4)] bg-[var(--gray-a2)] px-4 py-3">
            <agent.Logo size={20} />
            <div className="flex min-w-0 flex-col">
              <Text size="2" weight="medium">
                {agent.label}
              </Text>
              <Text size="1" color="gray">
                {agent.hint}
              </Text>
            </div>
            <Button variant="soft" size="1" color="gray" className="ml-auto">
              Paste token
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <Text size="1" color="gray">
              or use a Web2 account
            </Text>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {FALLBACK.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                className="flex items-center gap-1.5 rounded-full border border-[var(--gray-a5)] px-3 py-1.5 transition-colors hover:bg-[var(--gray-a3)]"
              >
                <p.Logo size={14} />
                <Text size="1">{p.short}</Text>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
