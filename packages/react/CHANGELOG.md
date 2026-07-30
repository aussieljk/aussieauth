# Changelog

All notable changes to `@aussieljk/auth` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses
[semantic versioning](https://semver.org/). A version tag (`vX.Y.Z`) publishes
the package — see the release workflow.

## [Unreleased]

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
