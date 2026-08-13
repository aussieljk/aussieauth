# Changelog

All notable changes to `@aussieljk/auth` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses
[semantic versioning](https://semver.org/). A push to master publishes whenever
the version here is one npm doesn't have yet — see the ship workflow.

## [Unreleased]

## [0.4.0]

### Added

- **Setup needs no credentials.** A registration whose origins are all
  development ones — localhost, `*.local`, `*.localhost`, a LAN address, on any
  port — or app schemes is accepted without `AUSSIEAUTH_SECRET`, and the
  deployment trusts a dev origin on sight whether it registered or not. The
  secret was never protecting anything (sending a request from
  `http://localhost:5173` already means running code on that machine) and it was
  the one step in the install that an agent could not complete, so it ended with
  a list of manual instructions handed back to a human. Public origins are
  unchanged.
- `aussieauth` with no subcommand runs the whole install. It used to print the
  usage screen and leave the reader to choose, which is how a setup ends up
  half-done in three different ways.
- `aussieauth doctor` — every step as a pass/fail line with the fix beside each
  failure, and a non-zero exit while anything is still wrong. Written to be read
  by an agent as much as a person.
- The deployment is probed before anything is written: reachable, serves auth,
  publishes a JWKS, and not older than the installed client. A deployment
  missing a capability is reported as *old*, because the fix is a push rather
  than a bug report. `/apps/health` on the server side is what makes that
  answerable.
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

- `init` fails rather than reporting a half-finished setup. If the deployment is
  wrong or out of date it writes nothing at all; if registration fails, the
  command fails with it. It used to finish green and print the command to run
  once you had a secret.
- The dev origin is read out of the project rather than guessed from the
  framework — an explicit `--port`, a `PORT=`, or the
  `https://<name>.localhost` that portless serves on. A registered origin that
  differs from the real one by a port number produces a card that renders and
  then fails on click.
- `.env.local` is corrected when it already holds a different `…AUSSIEAUTH_URL`.
  Appending was ignored by every dotenv reader, which is how a project ends up
  pointed at its own Convex deployment: a URL that answers, serves no auth, and
  looks right.
- A dev origin another app already claimed is skipped and named rather than
  failing the registration. Two projects on `http://localhost:5173` is the
  normal state of a machine with two Vite apps on it, and sign-in works from it
  either way.
- The passkey related-origins warning counts only real origins, and development
  origins are the last to take a slot — so scratch projects can no longer cost a
  live app its passkeys, and nobody is warned about something that was never
  wrong.
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

[Unreleased]: https://github.com/aussieljk/aussieauth/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/aussieljk/aussieauth/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/aussieljk/aussieauth/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/aussieljk/aussieauth/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/aussieljk/aussieauth/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/aussieljk/aussieauth/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/aussieljk/aussieauth/releases/tag/v0.2.0
