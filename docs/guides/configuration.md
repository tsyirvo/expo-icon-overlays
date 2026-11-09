# Configuration

See the [README](../../README.md) for installation and the options table.
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

For development, prefer a fixed `DEV` banner without a version.
A native build cache can reuse an older development build.
See [build caching](build-caching.md) before adding version or commit text.

## Disable overlays

Set `enabled: false` or use `overlays: []`. Neither option changes native files.
`enabled: false` also skips WASM loading.
Options must remain valid even when overlays are disabled.

Run prebuild before rebuilding an existing native project, including after disabling overlays.
The plugin does not refresh an installed app's icons.

## Overlay rules

- Overlays draw in array order.
- Positions must be unique.
- A top banner cannot share an array with a ribbon.
- Colors accept `#RGB` or `#RRGGBB`.
- Tinted icons use white strips and black text.
- Monochrome icons use white strips with transparent text cutouts.

Unknown fields, invalid options, duplicate active plugin entries and unsupported Expo versions cause config-loading errors.

## Version text

`{version}` is the only token. The plugin resolves it from `config.version` during the native mod in prebuild.
Missing or invalid version text causes a prebuild error.
Build numbers and commit SHA tokens are not supported.
Use literal commit text only if you accept its effect on [build caching](build-caching.md).

## Supported text

Text uses NFC normalization and preserves case and spacing.
Supported characters are U+0020–U+007E and U+00A0–U+017F, except U+00AD.

The plugin rejects:

- Whitespace-only text and control characters.
- Unsupported characters and unknown tokens.
- Literal or malformed braces.

`DEV & QA` and `<DEV>` render literally.

## Text length

Text shrinks to fit without truncation.
Text that cannot fit at the minimum size causes a prebuild error.
The longest text width depends on the overlay and icon type. Widths are multiples of the font size:

| Overlay | Square and tinted icons | Round, adaptive and monochrome icons |
| ------- | ----------------------- | ------------------------------------ |
| Banner  | 5.5                     | 4.75                                 |
| Ribbon  | 6.5                     | 5                                    |

Android always generates an adaptive foreground, so Android builds use the narrower limits.
Keep text to about 7 capital letters to fit every icon type:

| Text                                          | Result                                           |
| --------------------------------------------- | ------------------------------------------------ |
| `STAGING`, `PREVIEW`, `10.12.3`, `1.2.3-rc.1` | Fits every icon type.                            |
| `INTERNAL`                                    | Fails on round, adaptive and monochrome banners. |
| `1.2.3-beta.4`                                | Fits only ribbons on square and tinted icons.    |
| `DEVELOPMENT`, `PRODUCTION`                   | Fails on every icon type.                        |

The length of `{version}` text can change with each release.
A longer version can make a later prebuild fail, so test prerelease version formats before relying on them.

## Platform behavior

The plugin changes only generated native PNG icons.
It leaves source icons, Android backgrounds and the web favicon unchanged.

On iOS, it supports single/light, dark and tinted PNG icons.

It also supports an Icon Composer folder set as a string in `ios.icon`.
Expo copies that folder into the iOS project, and the plugin changes only the copy:

- It adds `expo-icon-overlays.png` and `expo-icon-overlays-tinted.png` to the copy's `Assets/` folder.
  Each layer is a transparent 1024px PNG that fills the Icon Composer canvas.
- It adds one group in front of the app's groups in the copy's `icon.json`, without glass or shadow.
  The tinted layer replaces the default layer in tinted and clear appearances, with a white strip and black text.
  Default and dark appearances use the owner colors.
- It builds the copy's `icon.json` from the source folder on each prebuild, so overlays never accumulate.

The source folder stays unchanged. Prebuild fails when the source folder or its `icon.json` is missing,
or when the source `Assets/` folder already uses one of the two layer filenames.
A disabled plugin changes no file, so the copy keeps both layer files until `prebuild --clean`.
The restored `icon.json` no longer references them.

On Android, it supports legacy, round, adaptive foreground and monochrome PNG icons.
Round overlays retain the source alpha. Adaptive and monochrome layouts use the safe circle.

Icon changes require prebuild and a new native build. OTA updates cannot change icons.
Installed variants need distinct application identifiers. The plugin does not set those identifiers.
