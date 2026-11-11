# Development

Run the commands below from the repository root. Use Bun for installation and scripts.
Agents: read [AGENTS.md](../../AGENTS.md) before changing code.

## Setup

```sh
mise trust
mise install
bun install --frozen-lockfile
bun run hooks:install
bun run build
```

Building from source on Node 22 needs 22.18.0 or later, because `tsdown` requires it.
The published package has no such limit; see the [README](../../README.md#requirements).

`bun run dev` rebuilds the plugin on change.
`bun run test` runs Vitest. Do not use `bun test`, which runs Bun's own test runner.

## Required checks

Run all of these before you open a pull request:

```sh
bun run lint:ts
bun run lint:ci
bun run format:check
bun run test
bun run knip
bun run hooks:check
bun run check:fixtures
bun run check:package
```

`lint` and `format` fix files in place. Their `:ci` and `:check` variants only report.
Tests render real icons and compare them with reviewed images.
See [rendering](rendering.md) for previews and how to update those images.

## Fixture checks

`check:fixtures` builds the plugin and runs full Expo prebuilds in temporary apps.
It checks the final icon pixels and files on iOS and Android, including `.icon` folders,
version tokens, fingerprints, repeated prebuilds, disabled overlays and error cases.
See `scripts/check-fixtures.ts` for the full list.

Each icon setup runs on both a fresh and an existing native project.
The temporary apps are kept, and the script prints where they are.
The checks need no secrets, but Expo may download its public native template.
They don't compile an app or run it on a device.

## Packed-package checks

`check:package` packs the plugin and installs the tarball into a temporary app outside this repository.
It checks that Expo resolves and loads the plugin, then runs the same final-icon checks.
It uses the fixture's locked dependencies.
Set `ICON_OVERLAYS_EXPO` to an Expo version, range or dist-tag to test another SDK.

To check an existing tarball without rebuilding it:

```sh
sh scripts/check-package.sh /absolute/path/package.tgz
```

## Test other Expo versions

```sh
bun run check:sdk -- 56.0.0
bun run check:sdk -- '^57.0.0'
ICON_OVERLAYS_CANDIDATE=1 bun run check:sdk -- canary
```

`check:sdk` packs the plugin and runs the packed-package checks against the requested Expo version,
with the React and React Native versions that Expo bundles.
It fails if the plugin loads a different Expo copy.
Ranges and dist-tags pick the newest version older than three days,
so a brand-new Expo patch doesn't break CI.
`ICON_OVERLAYS_CANDIDATE=1` tests an SDK outside the supported range.
It widens the Expo peer range only in a temporary, unpublished copy of the package.

## CI

CI tests the latest three Expo SDK majors (currently 56, 57 and 58)
on Node `22.13.0` (the minimum), and the latest Node 24 and Node 26.

| Trigger                 | Quality checks | SDK fixtures                                        | Packed package |
| ----------------------- | -------------- | --------------------------------------------------- | -------------- |
| Pull request            | Node 26        | Each SDK once, on a different Node: 22.13.0, 24, 26 | Node 22.13.0   |
| Push to `main`, release | Node 26        | Each SDK on Node 22.13.0, 24 and 26                 | Node 22.13.0   |

- Pull requests that change only Markdown skip the fixture and packed-package jobs.
- A new commit cancels the running checks of the same pull request.
- A weekly job tests Expo's `latest`, `next` and `canary` releases.
  Failures are early warnings; they don't change supported versions or block releases.
- Checks with `sharp` as the active image generator are deferred until an official Expo release fixes its loader.

SDK differences live in the fixture script, never in the plugin:

- SDK 57 and later need `--no-clean` to keep native folders on prebuild. SDK 56 keeps them by default.
- SDK 56 and 57 hash the app version in fingerprints. The checks skip it on every SDK, like SDK 58 does by default.

See [tooling and release](../agents/rules/tooling-and-release.md#builds-and-ci) for when to change the supported SDK range,
and the [release procedure](../releasing.md) for publishing.
