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
Text shrinks to fit without truncation.
Text that cannot fit at the minimum size causes a prebuild error.

## Platform behavior

The plugin changes only generated native PNG icons.
It leaves source icons, Android backgrounds and the web favicon unchanged.

On iOS, it supports single/light, dark and tinted PNG icons.
It does not support `.icon` folders.
Prebuild warns that no iOS overlays were applied for this format.
Both source and copied `.icon` folders stay unchanged. The plugin reports no iOS success count.

On Android, it supports legacy, round, adaptive foreground and monochrome PNG icons.
Round overlays retain the source alpha. Adaptive and monochrome layouts use the safe circle.

Icon changes require prebuild and a new native build. OTA updates cannot change icons.
Installed variants need distinct application identifiers. The plugin does not set those identifiers.
