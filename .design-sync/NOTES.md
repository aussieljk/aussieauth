# design-sync notes — @aussieljk/auth

## Build setup
- Shape: **package** (no Storybook). DS package is `packages/react` (`@aussieljk/auth`).
- Build the DS first: `bun run build` in `packages/react` (tsup + tailwind). `dist/index.js` + `dist/styles.css`.
- Converter entry: `--entry ./packages/react/dist/index.js`, `--node-modules ./packages/react/node_modules`.
- **Added a top-level `"types": "./dist/index.d.ts"` to `packages/react/package.json`.** The package previously declared types only via the `exports` map, which the converter's `projectFor`/`exportedNames` doesn't read — it fell back to a non-existent `index.d.ts` and discovered **zero** components (`[ZERO_MATCH]`). The top-level `types` field is the standard legacy fallback and is non-breaking. If a future build shows ZERO_MATCH, check this field is still present.

## Provider (critical)
- Components read their auth client via `useAuthClient()`, which **throws at render** if no client was ever configured. And ljkui's `<Theme>` is what injects the `--fui-ca-*` accent scale the components style off (hence the `[TOKENS_MISSING]` warning without it).
- Fix: `.design-sync/ds-provider.tsx` exports `PreviewProvider` = `<Theme appearance="light">` + `<AussieAuthClientProvider client={createAussieAuthClient({baseURL})}>`. Wired via `cfg.extraEntries` + `cfg.provider.component = "PreviewProvider"`.
- `[TOKENS_MISSING]` (118 `--fui-ca-*` vars) is **expected/benign** — those are injected at runtime by Theme, confirmed by rendered previews. Known render warn.

## Preview authoring
- Cards/SignIn: pass `respectRegistration={false}` so no network probe — renders a fixed method set statically. Confirmed styled render via agent-browser.
- `AussieAuthSignIn` `methods` does NOT hide the default `featured` social buttons — pass `featured={[]}` for a truly single-method card.
- `RememberedAccounts` returns `null` with no accounts — seed `localStorage["aussieauth.accounts"]` in the preview module (omit `cookie` to skip the `checkRemembered` network call), and pass the required `onNeedsPanel` prop.
- Overlays `RedirectOverlay` (`fixed inset-0`) and `RouteLoading` (`min-h-screen`) escape the card — set `cfg.overrides.<Name>.cardMode = "single"` + a viewport.
- `SolanaPanel` dynamically imports `./wallet` on click only — static render is fine.

## Verification
- Playwright NOT installed (user declined). Render check run with `--no-render-check`; visual verification is via `.review.html` (served) + agent-browser screenshots. No machine grading/capture — grades are eyeball-based.

## Grouping
- All exports land in one `general` group from src (only 3 src-matched, panels/logos/ui are multi-export single files). Groups assigned via stub category docs in `.design-sync/groups/*.md` mapped through `cfg.docsMap`.

## Re-sync risks
- The `"types"` field in `packages/react/package.json` is load-bearing for discovery — if reverted, ZERO_MATCH returns.
- Preview client points at a stand-in `https://demo.aussieauth.com`; it never connects in static render but a change to `createAussieAuthClient` requiring a live server would break previews.
- Grades are eyeball-based (no Playwright) — a re-sync with Playwright available could machine-verify.
