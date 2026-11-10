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
- `.icon` layer files and metadata, unchanged source folders and reserved, missing or full-group-limit `.icon` files.
- Duplicate rejection and missing or non-PNG files.
- Version tokens and native fingerprints.
- Repeated prebuilds, replacement text and disabled overlays.

Each icon setup uses fresh and existing native projects.
The script retains temporary apps and prints their location.
Fixtures need no Doppler values or secrets. Expo may download its public native template.
These checks do not compile an app or start a device.

## SDK checks and test policy

CI tests the latest three Expo SDK majors, currently 56, 57 and 58. The [README](../../README.md#requirements) lists the supported Node versions.
CI checks the newest version of each tested SDK outside the cooldown, from the release tarball.
Node 22 runs on `22.13.0`, the minimum supported version. Node 24 and Node 26 use their latest patch.
Development checks use the latest patch of each tested Node major.
Building from source requires Node 22.18.0 or later within Node 22 because `tsdown` requires it.
Consumers use the compiled package and do not need `tsdown`.

The test matrix follows the latest three SDK majors. It describes what CI checks, not the only versions that can work.
Add a new SDK to the peer range only after it passes its fixtures as a candidate.
Do not remove an SDK from the peer range when it leaves the matrix. It stays accepted, untested against later plugin changes.

| Trigger                 | Quality | SDK fixtures                                                    | Locked packed package |
| ----------------------- | ------- | --------------------------------------------------------------- | --------------------- |
| Pull request            | Node 26 | Each tested SDK once, on a different Node: `22.13.0`, 24 and 26 | Node `22.13.0`        |
| Push to `main`, release | Node 26 | Each tested SDK on Node `22.13.0`, 24 and 26                    | Node `22.13.0`        |

Fixture and packed-package jobs run the shipped plugin on every Node major, so tooling checks use Node 26 only.
Pull requests that change only Markdown files skip the fixture and packed-package jobs.
New commits cancel the running checks of the same pull request.

```sh
bun run check:sdk -- 56.0.0
bun run check:sdk -- '^57.0.0'
ICON_OVERLAYS_CANDIDATE=1 bun run check:sdk -- canary
```

`check:sdk` resolves the requested Expo version, builds and packs the plugin, then runs the packed-package checks against that version.
The temporary apps install the React and React Native versions that the selected Expo bundles.
The plugin therefore loads the requested Expo, and the check fails if it resolves another copy.
The temporary apps have no lockfile and keep the three-day cooldown.
A range or dist-tag therefore selects the newest version older than three days, so a new Expo patch does not block CI.
Fixtures use unmodified dependencies and let Expo select its image generator.
Active-Sharp checks remain deferred until an official Expo release fixes its loader.

SDK differences in the checks stay in the fixture script, not in the plugin:

- SDK 56 prebuild keeps native folders by default. SDK 57 and later need `--no-clean`.
- SDK 56 and 57 fingerprints hash config versions by default. The version checks skip them on every SDK, as SDK 58 does by default.

Weekly `latest`, `next` and `canary` probes run on Node 26 and widen the peer range only in temporary, unpublished candidate packages.
Probe failures are compatibility alerts. They do not change released support and do not gate publication.
See [build caching](build-caching.md) for the fingerprint checks and their limits.

## Packed-package checks

`check:package` packs the build and installs it into a temporary app outside this repository.
It checks CommonJS and Expo plugin resolution, config loading and the same final-asset suite.
It uses the fixture's locked dependencies, not package dev dependencies or links.
Set `ICON_OVERLAYS_EXPO` to an Expo version, range or dist-tag to check another SDK instead of the lockfile.
The script retains temporary files and prints their location.

To check an existing tarball without rebuilding it, run:

```sh
sh scripts/check-package.sh /absolute/path/package.tgz
```

Maintainers: see the [release procedure](../releasing.md) for publication controls and approval steps.
