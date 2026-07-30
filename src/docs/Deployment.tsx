import { Typography } from "@aussieljk/frosted";
import { type RefObject, useCallback, useEffect, useState, useSyncExternalStore } from "react";

const { Text } = Typography;

/**
 * The docs, with your deployment's name already in them.
 *
 * Every command on this site used to carry a placeholder —
 * `https://<deployment>.convex.site` — which meant every command was copied,
 * pasted and then edited. That edit is where the `.cloud` / `.site` mistake
 * gets made, silently, and it produces a network error with no response body
 * to explain itself. Removing the edit removes the whole class of "I pasted it
 * wrong", which for a one-person project is most of the support surface.
 *
 * It's a pass over the rendered code blocks rather than a rendering change:
 * the pages already prerender to static HTML and already hydrate, and the
 * value is per-reader, so it can't be baked in at build time. `/llms.txt` and
 * the raw `.md` files keep the placeholder, which is right — a crawler has no
 * deployment.
 */

const STORAGE_KEY = "aussieauth:deployment";

/**
 * The placeholders as they actually appear in `docs/*.md`. Both spellings are
 * in use and both are load-bearing somewhere, so both are matched rather than
 * one being normalised away — a doc that stopped matching would fail silently.
 *
 * **Write `your-deployment`, not `<deployment>`, inside a shell fence.** Shiki
 * highlights those with a shell grammar, which reads `<` as a redirection and
 * splits the word across five spans — five text nodes, none of which contains
 * the placeholder, so the substitution below silently does nothing. A plain
 * word stays one token. (Inline `<code>` in prose isn't highlighted at all, so
 * either spelling works there.)
 */
const PLACEHOLDER = /<your-deployment>|<deployment>|your-deployment/g;

/**
 * A deployment name out of whatever was pasted in.
 *
 * Accepting a full URL matters more than it looks: the value most people have
 * on their clipboard is `https://giddy-dinosaur-765.convex.cloud` from the
 * Convex dashboard, and asking them to strip it back to a bare name would
 * reintroduce exactly the hand-editing step this exists to delete.
 */
export const toDeploymentName = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const host = trimmed.replace(/^https?:\/\//, "").split("/")[0];
  const name = host.replace(/\.convex\.(site|cloud)$/, "");
  // Convex deployment names are lowercase words and digits joined by dashes.
  return /^[a-z0-9-]+$/.test(name) ? name : "";
};

// --- the shared value ------------------------------------------------------

// A module-level store rather than context, because the field and the rewrite
// live on different pages of the same layout and both have to survive a
// client-side navigation. `useSyncExternalStore` also gets the server snapshot
// right for free: "" during the prerender, so the HTML never disagrees with
// the first client render.
const listeners = new Set<() => void>();
let current = "";

const notify = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setDeployment = (value: string) => {
  current = value;
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing. The value still works for this page view.
  }
  notify();
};

export function useDeployment() {
  const value = useSyncExternalStore(
    subscribe,
    () => current,
    () => "",
  );

  // Restored once, after hydration — reading localStorage during render would
  // make the first client paint disagree with the prerendered HTML.
  useEffect(() => {
    if (current) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        current = stored;
        notify();
      }
    } catch {
      /* no storage, no restore */
    }
  }, []);

  return value;
}

// --- the rewrite -----------------------------------------------------------

/** The original text of a node, so re-running never compounds a substitution. */
const originals = new WeakMap<Text, string>();

/**
 * Every text node inside a `<code>` on the page.
 *
 * Confined to code deliberately. The placeholder also appears in prose that
 * *explains* the placeholder ("`<deployment>` is your Convex deployment
 * name"), and rewriting a sentence about the thing into the thing itself would
 * turn an explanation into a tautology.
 */
const codeTextNodes = (root: HTMLElement) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest("code, pre")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const found: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    found.push(node as Text);
  }
  return found;
};

/**
 * Substitute the reader's deployment name into every code block under `root`.
 *
 * Re-runs from the stored original on every change, so clearing the field puts
 * the placeholders back rather than leaving whatever was typed last.
 */
export function useDeploymentRewrite(ref: RefObject<HTMLElement | null>) {
  const deployment = useDeployment();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    for (const node of codeTextNodes(root)) {
      const original = originals.get(node) ?? node.data;
      if (!PLACEHOLDER.test(original)) {
        // `lastIndex` is stateful on a global regex; a test that matched
        // nothing still has to be reset or the next call starts mid-string.
        PLACEHOLDER.lastIndex = 0;
        continue;
      }
      PLACEHOLDER.lastIndex = 0;
      originals.set(node, original);
      node.data = deployment ? original.replace(PLACEHOLDER, deployment) : original;
    }
  });
}

// --- the field -------------------------------------------------------------

/**
 * One field, at the top of every docs page.
 *
 * Deliberately not a modal or a first-run prompt: it's useful to about half of
 * the people reading, and invisible cost to the rest is the right trade for a
 * convenience.
 */
export function DeploymentField() {
  const deployment = useDeployment();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? deployment;

  const commit = useCallback((value: string) => {
    setDraft(value);
    const name = toDeploymentName(value);
    // An empty field means "put the placeholders back"; a half-typed one means
    // "not yet" and leaves what's on screen alone rather than flickering.
    if (!value.trim()) setDeployment("");
    else if (name) setDeployment(name);
  }, []);

  const resolved = toDeploymentName(shown);

  return (
    <div className="mb-8 flex flex-col gap-2 rounded-[var(--radius-3)] border border-[var(--gray-a5)] bg-[var(--gray-a2)] p-3">
      <label className="flex flex-col gap-1.5">
        <Text color="gray" weight="medium">
          Your deployment
        </Text>
        <input
          value={shown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="giddy-dinosaur-765"
          onChange={(e) => commit(e.target.value)}
          className="w-full rounded-[var(--radius-2)] border border-[var(--gray-a6)] bg-[var(--color-background)] px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-[var(--accent-8)]"
        />
      </label>
      <Text color="gray">
        {resolved ? (
          <>
            Every command below now points at{" "}
            <code>
              {resolved}
              .convex.site
            </code>
            . Saved for the other pages too.
          </>
        ) : (
          <>
            Paste your deployment name or its URL and every command on this page fills itself in.
            Both <code>.convex.cloud</code> and <code>.convex.site</code> work — auth is served from{" "}
            <code>.convex.site</code>, which is the one that&rsquo;s easy to get wrong.
          </>
        )}
      </Text>
    </div>
  );
}
