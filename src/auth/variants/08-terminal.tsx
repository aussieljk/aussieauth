import { useState } from "react";
import { PROVIDERS, type Provider } from "../providers";

/** The flag you'd pass to the fake CLI for each method. */
const flagFor = (p: Provider) => `--provider ${p.id}`;

/** The lines the CLI "prints" once a method is chosen. */
function transcriptFor(p: Provider): string[] {
  const common = [
    `→ resolving strategy "${p.id}" … ok`,
    `→ category: ${p.category}`,
  ];
  switch (p.form) {
    case "none":
      return [
        ...common,
        `→ opening handoff for ${p.label} …`,
        `✓ session established (mock)`,
      ];
    case "otp":
      return [
        ...common,
        `→ dispatching 6-digit code …`,
        `? code: ______`,
        `✓ session established (mock)`,
      ];
    case "token":
      return [
        ...common,
        `→ minting scoped credential …`,
        `✓ token: ${p.id === "agent" ? "agt_live_9f2c…" : "8891 4420 7715 0362"}`,
      ];
    case "email-only":
      return [...common, `→ sending link to you@example.com`, `✓ check inbox`];
    default:
      return [
        ...common,
        `? identifier: you@example.com`,
        `? secret: ••••••••`,
        `✓ session established (mock)`,
      ];
  }
}

/**
 * Variant 8 — auth as a CLI. Useful framing for a developer tool or, more to
 * the point, for agent auth: the same sixteen strategies as flags on a command.
 *
 * This one deliberately commits to a single dark look in both themes.
 */
export default function TerminalAuth() {
  const [selected, setSelected] = useState<Provider | null>(null);

  return (
    <div className="flex justify-center">
      <div className="w-[640px] overflow-hidden rounded-[var(--radius-4)] border border-white/10 bg-[#0d1117] shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-xs text-white/50">
            aussieauth — login
          </span>
        </div>

        <div className="max-h-[520px] overflow-y-auto p-5 font-mono text-[13px] leading-relaxed">
          <div className="text-white/50">
            <span className="text-[#28c840]">$</span>{" "}
            <span className="text-white">aussieauth login --list</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
            {PROVIDERS.map((p, i) => {
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-left transition-colors ${
                    active ? "bg-[#28c840]/15" : "hover:bg-white/5"
                  }`}
                >
                  <span className="w-5 shrink-0 text-white/30">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-white">
                    <p.Logo size={14} />
                  </span>
                  <span
                    className={active ? "text-[#7ee787]" : "text-white/80"}
                  >
                    {flagFor(p)}
                  </span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className="mt-5 flex flex-col gap-1">
              <div>
                <span className="text-[#28c840]">$</span>{" "}
                <span className="text-white">
                  aussieauth login {flagFor(selected)}
                </span>
              </div>
              {transcriptFor(selected).map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("✓")
                      ? "text-[#7ee787]"
                      : line.startsWith("?")
                        ? "text-[#e3b341]"
                        : "text-white/60"
                  }
                >
                  {line}
                </div>
              ))}
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[#28c840]">$</span>
                <span className="inline-block h-4 w-2 animate-pulse bg-white/70" />
              </div>
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-1">
              <span className="text-[#28c840]">$</span>
              <span className="text-white/40">
                pick a strategy above, or type one
              </span>
              <span className="inline-block h-4 w-2 animate-pulse bg-white/70" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
