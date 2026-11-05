# expo-icon-overlays — a community package

Text overlays on Expo app icons, under development.

**Not published yet.** The plugin validates options and stamps Expo-generated native icons during prebuild.
Native integration and final-asset fixtures are implemented. Starter integration and release acceptance remain incomplete.

## Scope and support

The first release targets Expo SDK 58 (`expo ^58.0.0`) and Node 24 or later.
Node 22 is not supported. CI checks Node 24 and Node 26 against the minimum and latest stable SDK 58 versions.
Fixtures need no Doppler values or secrets. They use unmodified dependencies and let Expo select its image generator.
Active-Sharp checks remain deferred until an official Expo release fixes its loader.

The plugin runs during prebuild. Icon changes need prebuild and a new native build.
OTA updates cannot change icons. Installed variants need distinct application identifiers.
The plugin does not set those identifiers.

PNG coverage includes iOS single/light, dark and tinted icons, plus Android legacy, round, adaptive foreground and monochrome icons.
The plugin leaves Android backgrounds, the web favicon and source icons unchanged.
iOS `.icon` folders are not supported in the first release. Prebuild warns that no iOS overlays were applied.
The plugin leaves both source and copied `.icon` folders unchanged and reports no iOS success count.
Run prebuild before rebuilding an existing native project, including after changing text or disabling overlays.
Duplicate active entries and unsupported consumer Expo versions fail when the config loads.

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
`dev` watches the plugin build. Tests use real rendering assets and reviewed PNG references.
Config-loading tests check plugin errors and inactive entries without mocking package modules.

### Rendering review

```sh
bun run preview -- ../react-native-starter/assets/icons
bun scripts/render-references.ts
```

The preview command expects `ios-light.png`, `ios-dark.png`, `ios-tinted.png`,
`default.png` and `adaptive-icon.png` in the supplied directory.
Open `preview/index.html` to inspect all seven icon variants with short and long text.
Each sheet shows circle, squircle and rounded-square masks at full size and 60px.
`preview/contact-sheet.png` gives a compact overview. All preview output stays ignored.

The reference command writes ten candidates and a review sheet to `preview/references/`.
Inspect every candidate before running `bun scripts/render-references.ts --accept`.
That command replaces the committed references in `tests/references/`.
`bun run test` compares exact pixels and writes failed comparisons to `preview/diffs/`.

The approved strip height is 20% of the layout height. The minimum font size is 8%.
Square and round layouts use the full icon size. Adaptive and monochrome layouts use the 66/108 safe circle.
Round overlays retain the source alpha. Adaptive previews show the launcher's 72/108 viewport.
Tinted icons use white strips and black text. Monochrome icons use white strips with transparent text cutouts.

Text uses NFC normalization. Supported ranges are U+0020–U+007E and U+00A0–U+017F, except U+00AD.
Text must contain a visible character. Only `{version}` is a token. Literal braces are not supported.
Rendering escapes SVG characters and preserves letter case and spacing.
Text shrinks to fit, without truncation. Text that cannot fit at the minimum size causes an error.

### Font regeneration

The committed font is an Inter v4.1 Bold subset with weight 700 and optical size 14.
The script verifies the upstream font's SHA-256 before subsetting.
Inter omits U+0149. The script composes this glyph from Inter's apostrophe and `n` glyphs.

```sh
python3 -m venv /tmp/icon-overlays-font-tools
/tmp/icon-overlays-font-tools/bin/pip install fonttools==4.62.1
/tmp/icon-overlays-font-tools/bin/python scripts/subset-font.py
bun run test
```

Regeneration downloads the pinned upstream font and its license. Review both files before committing them.

`check:fixtures` builds the plugin, installs locked fixture dependencies and runs full CLI prebuilds in temporary apps.
It checks final overlay pixels, dimensions, untouched assets, applied counts, `.icon` warnings, duplicate rejection,
missing/non-PNG files, version tokens and fingerprints. It also checks repeated prebuilds, replacement text and disabled overlays.
Each icon setup uses fresh and existing native projects. The script retains temporary apps and prints their location.
These checks do not compile an app or start a device. Expo may download its public native template.

```sh
bun run check:sdk -- 58.0.0
bun run check:sdk -- '^58.0.0'
ICON_OVERLAYS_CANDIDATE=1 bun run check:sdk -- canary
```

`check:sdk` resolves an exact consumer version and runs the same final-asset checks in temporary apps.
The owner approved exact cooldown exceptions for Expo 58.0.23 and its required Expo dependencies in these apps only.
Repository dependencies and the three-day cooldown stay unchanged.
Weekly `latest`, `next` and `canary` probes widen the peer range only in temporary, unpublished candidate packages.
Probe failures are compatibility alerts. They do not change released support and do not gate publication.
The fingerprint check uses Expo's default balanced preset with `runtimeVersion: { policy: 'appVersion' }`.
A `{version}` overlay preserves the fingerprint for a version-only change. Literal version text changes it.

`check:package` packs the build and installs it into a temporary app outside this repository.
It checks CommonJS and Expo plugin resolution, config loading and the same full final-asset suite.
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

Package code: MIT.

The bundled [Inter](https://rsms.me/inter/) subset is by Rasmus Andersson and contributors.
See [assets/Inter-LICENSE.txt](assets/Inter-LICENSE.txt) for the SIL Open Font License 1.1.
The rasterizer dependency, `@resvg/resvg-wasm`, supplies its WASM asset under its own MIT license.
