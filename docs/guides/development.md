# Development

Read [AGENTS.md](../../AGENTS.md) before changing code.
Run the commands below from the repository root.
Use Bun for installation and scripts.

## Setup

```sh
mise trust
mise install
bun install --frozen-lockfile
bun run hooks:install
bun run build
```

`bun run dev` watches the plugin build.
`bun run test` invokes Vitest, not Bun's test runner.

## Required checks

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

`lint` and `format` write files. Their `:ci` and `:check` variants do not.
Tests use real rendering assets and reviewed PNG references.
Config-loading tests check plugin errors and inactive entries without mocking package modules.
See [rendering](rendering.md) for previews and reference approval.

## Fixture checks

`check:fixtures` builds the plugin and installs locked fixture dependencies.
It runs full CLI prebuilds in temporary apps and checks:

- Final overlay pixels, dimensions, unchanged assets and applied counts.
- `.icon` warnings, duplicate rejection and missing or non-PNG files.
- Version tokens and native fingerprints.
- Repeated prebuilds, replacement text and disabled overlays.

Each icon setup uses fresh and existing native projects.
The script retains temporary apps and prints their location.
Fixtures need no Doppler values or secrets. Expo may download its public native template.
These checks do not compile an app or start a device.

## SDK checks and support policy

The first release supports only Expo SDK 58. The [README](../../README.md#requirements) lists the supported Node versions.
CI checks Node 22, Node 24 and Node 26 against the minimum SDK 58 version and the newest one outside the cooldown.
Isolated tarball checks also run on Node `22.13.0`, the minimum supported version.
Development checks use the latest patch of each tested Node major.
Building from source requires Node 22.18.0 or later within Node 22 because `tsdown` requires it.
Consumers use the compiled package and do not need `tsdown`.

Support includes only tested SDK majors. The target is the latest three SDK majors, not an untested compatibility promise.
Removing the oldest supported SDK requires a major package release.

```sh
bun run check:sdk -- 58.0.0
bun run check:sdk -- '^58.0.0'
ICON_OVERLAYS_CANDIDATE=1 bun run check:sdk -- canary
```

`check:sdk` installs the requested Expo version and the packed plugin, then runs the same final-asset checks in temporary apps.
The plugin therefore loads the requested Expo, and the check fails if it resolves another copy.
The temporary apps have no lockfile and keep the three-day cooldown.
A range or dist-tag therefore selects the newest version older than three days, so a new Expo patch does not block CI.
Fixtures use unmodified dependencies and let Expo select its image generator.
Active-Sharp checks remain deferred until an official Expo release fixes its loader.

Weekly `latest`, `next` and `canary` probes widen the peer range only in temporary, unpublished candidate packages.
Probe failures are compatibility alerts. They do not change released support and do not gate publication.
See [build caching](build-caching.md) for the fingerprint checks and their limits.

## Packed-package checks

`check:package` packs the build and installs it into a temporary app outside this repository.
It checks CommonJS and Expo plugin resolution, config loading and the same final-asset suite.
It uses the fixture's locked dependencies, not package dev dependencies or links.
The script retains temporary files and prints their location.

To check an existing tarball without rebuilding it, run:

```sh
sh scripts/check-package.sh /absolute/path/package.tgz
```

Maintainers: see the [release procedure](../releasing.md) for publication controls and approval steps.
