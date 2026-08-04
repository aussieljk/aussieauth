# Changelog

All notable changes to `@aussieljk/auth` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses
[semantic versioning](https://semver.org/). A version tag (`vX.Y.Z`) publishes
the package — see the release workflow.

## [Unreleased]

### Added

- Two named ways to use AussieAuth, and a flag that picks between them.
  `aussieauth init` now defaults to **hosted**: aussieauth.com mints the
  session and the project's own Convex deployment only verifies it, so a new
  app is three commands with no auth code, no auth tables and no secrets.
  `--self-hosted` (or `--url`) keeps the previous behaviour, where the app's own
  deployment is the issuer.
- `init` writes `convex/auth.config.ts`. This was the missing half of the
  scaffold: without it sign-in succeeds in the browser and every query still
  sees `null`, which reads as a bug in the card. `--no-convex` skips it, and it
  is only written when the project has a `convex/` directory.
- `authUrlForMode`, `authConfigFile`, `HOSTED_AUTH_URL` and the `Mode` type,
  covered by unit tests — the issuer is the one thing the two modes disagree
  about and every way of getting it wrong is silent.

### Changed

- `init` finishes by naming the one command it cannot run for you
  (`bunx convex dev`), and says which mode it just set up.

## [0.3.1]

### Added

- This changelog.
- Release now runs `lint` and `test` before publishing, so a tag can't ship a
  package that doesn't build or pass its tests.

### Changed

- Sign-in card no longer emits `className`s of its own; all styling is scoped by
  the package stylesheet.

## [0.3.0]

### Added

- Two-factor (TOTP) available across every method, with an enrolment and
  challenge flow.
- A client provider (`AussieAuthProvider`) that supplies the auth client,
  Convex client, and card context from one place; `/convex` subpath for
  Convex apps, root entry stays Convex-free.
- Generated server-plugin copies, kept in sync by `scripts/sync-server-plugins.ts`
  and guarded by `generated:check` in CI.

### Changed

- Fail-closed behaviour on notification errors.
- More usable when forked/cloned: the CLI's method list is the card's source of
  truth, so a CLI-registered app can't silently enforce a method off.

## [0.2.2]

### Removed

- Google One Tap — it is inherently a popup and couldn't meet the
  single-consent goal. Removing it means the card is popup-free.

## [0.2.1]

- No functional changes. Proves the tag → npm publish pipeline is idempotent.

## [0.2.0]

### Added

- Extracted the sign-in card and auth client into `@aussieljk/auth`.
- Split-screen landing with live card, admin surface, and initial e2e coverage.
- TOTP two-factor, a sessions list, and CI.

[Unreleased]: https://github.com/aussieljk/aussieauth/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/aussieljk/aussieauth/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/aussieljk/aussieauth/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/aussieljk/aussieauth/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/aussieljk/aussieauth/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/aussieljk/aussieauth/releases/tag/v0.2.0
