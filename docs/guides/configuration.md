# Configuration

See the [README](../../README.md) for installation, the options table and platform support.
The public types are `IconOverlay` and `IconOverlayOptions`.

## Select overlays by environment

Set `APP_ENV` explicitly for each build. Adapt this example to your existing `app.config.ts`:

```ts
import type { IconOverlayOptions } from "expo-icon-overlays";

const options = {
  enabled: process.env.APP_ENV !== "production",
  overlays: [
    { type: "banner", text: "STAGING", background: "#D97706" },
    { type: "ribbon", text: "{version}" },
  ],
} satisfies IconOverlayOptions;

export default {
  expo: {
    name: "Example",
    slug: "example",
    version: "1.2.3",
    plugins: [["expo-icon-overlays", options]],
  },
};
```

For development builds, we recommend a fixed `DEV` banner without a version.
Cached development builds can keep showing an older version. See [build caching](build-caching.md) for details.

## Disable overlays

Set `enabled: false` or use `overlays: []`. The plugin then changes no native files.
Options must stay valid even when overlays are disabled.

Disabling overlays does not restore the icons in an existing native project by itself.
Run prebuild again, then create a new native build.

## Overlay rules

- Overlays draw in the order you list them.
- Each overlay needs its own position.
- You can't combine a top banner with a ribbon.
- Colors accept `#RGB` or `#RRGGBB`.
- iOS tinted icons and Android monochrome icons ignore your colors.
  They use a white strip with black text (iOS) or with see-through text (Android).

Unknown fields, invalid options, duplicate plugin entries and unsupported Expo versions fail when the config loads.

## Version text

`{version}` is replaced with your app's `version` when you run prebuild.
It is the only supported token. Build numbers and commit SHAs are not supported.
Prebuild fails when `version` is missing or the result does not fit.

You can write a commit SHA as literal text, but it affects [build caching](build-caching.md).

## Supported text

Text can use English letters, digits, punctuation and spaces,
plus the accented letters of most Western and Central European languages.
Case and spacing are kept as written.

Prebuild fails for:

- Empty or whitespace-only text.
- Emoji, control characters and other unsupported characters.
- Braces other than `{version}`.

Characters such as `&` and `<` render as written: `DEV & QA` and `<DEV>` both work.

<details>
<summary>Exact character ranges</summary>

U+0020–U+007E and U+00A0–U+017F, except U+00AD (soft hyphen). Text is NFC-normalized first.

</details>

## Text length

Text shrinks to fit. It is never cut off. Text that cannot fit at the minimum size fails prebuild.

Keep text to about 7 capital letters. Android icons have less room than iOS icons,
so this limit fits every icon on both platforms:

| Text                                          | Result                    |
| --------------------------------------------- | ------------------------- |
| `STAGING`, `PREVIEW`, `10.12.3`, `1.2.3-rc.1` | Fits every icon.          |
| `INTERNAL`                                    | Fails on Android banners. |
| `1.2.3-beta.4`                                | Fits only iOS ribbons.    |
| `DEVELOPMENT`, `PRODUCTION`                   | Fails everywhere.         |

`{version}` text grows when your version grows.
Test prerelease formats such as `-beta.10` before you rely on them.

## Icon Composer (`.icon`) folders

Set the folder path as a string in `ios.icon`. Building requires Xcode 26 or later.

- Your source folder is never changed. The plugin edits only the copy that Expo puts in the iOS project.
- The overlays are added as one extra layer group on top of your icon.
  Xcode allows at most four groups, so your icon can have at most three.
  If it has four, merge two of them in Icon Composer.
- Prebuild fails when the source folder or its `icon.json` is missing.
- After you disable overlays, the copy keeps two unused image files until `prebuild --clean`.
  They do not appear in the icon.

See [rendering](rendering.md#icon-composer-layers) for the file names and layer details.
