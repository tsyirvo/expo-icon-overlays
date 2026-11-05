# expo-icon-overlays — a community package

Text overlays on Expo app icons, currently a scaffold.

**Not ready for use.** The plugin returns the Expo config unchanged.
It does not validate options, render overlays or modify native icons.
There is no published release from this scaffold.

## Scope and support

The planned first release targets Expo SDK 58 (`expo ^58.0.0`) and Node 24 or later.
Node 22 is not supported. CI checks Node 24 and Node 26 with Expo `58.0.22`.
Minimum/latest SDK fixtures and final-image checks arrive with the native implementation.
The fixture has no custom icon yet. It needs no Doppler values or secrets.

The plugin will run during prebuild. Icon changes need prebuild and a new native build.
OTA updates cannot change icons. Installed variants need distinct application identifiers.
The plugin will not set those identifiers.

## Development

```sh
mise trust
mise install
bun install --frozen-lockfile
bun run hooks:install
bun run build
```

Use Bun for scripts and installation. `bun run test` invokes Vitest, not Bun's test runner.
Read [AGENTS.md](AGENTS.md) before changing code.

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
`dev` watches the plugin build. `preview` reports that contact-sheet rendering is not implemented yet.
Vitest permits an empty suite during scaffolding. Behavioral tests begin when the plugin has behavior.
Do not add a unit test for the identity plugin.

`check:fixtures` builds the plugin and prebuilds both native platforms without dependency installation.
It does not compile an app or start a device. Generated native directories stay ignored.
The Expo CLI may download its public native template on the first run.

`check:package` packs the build and installs it into a temporary app outside this repository.
It checks CommonJS and Expo plugin resolution, config loading and both platform prebuilds.
It uses the fixture's locked dependencies, not package dev dependencies or links.
The script retains temporary files and prints their location for inspection.
Pass an existing tarball to `sh scripts/check-package.sh /absolute/path/package.tgz`
to check that exact artifact without rebuilding it.

## Release setup

The workflow files are configuration only. Local checks do not prove that GitHub Actions or npm publishing works.
Before enabling releases, the owner must approve repository creation and pushes.
Then configure these external settings:

1. Create the public `tsyirvo/expo-icon-overlays` repository with `main` as the default branch.
2. Require the quality jobs and PR-title check through branch protection.
3. Add `RELEASE_PLEASE_TOKEN` with the repository permissions needed for release PRs and tags.
   A separate token allows release PR events to trigger quality workflows.
4. Protect the `npm` environment with required owner review and a `main` deployment restriction.
5. Configure the npm trusted publisher for this repository, `publish.yml` and environment `npm`.
   Allow direct publication. Use OIDC, not an npm write token.
   Confirm package-name ownership and first-publication requirements before attempting publication.
6. Protect release tags. Review the Release Please PR before merging it.

Release Please starts at `0.1.0`. Remove `release-as` from its configuration after the first release.
Publication does not run automatically. The owner must dispatch `Publish` from `main`,
enter the approved tag and select the approval input.
The tag must match the package version and the selected `main` commit.
Version `0.0.0` cannot publish.

The publishing workflow repeats quality checks, supported-SDK fixture prebuilds and packed-package checks
on Node 24 and Node 26. It publishes the same tarball that passed those checks.
The protected environment requires approval before the OIDC publication job starts.
The Node 24 setup supplies an npm CLI compatible with trusted publishing (npm 11.5.1 or later).
Public npm publication includes provenance.

Do not publish the scaffold. The implementation and first-release acceptance checks must pass first.

## License

MIT. Font and WASM assets arrive with the renderer, not with this scaffold.
