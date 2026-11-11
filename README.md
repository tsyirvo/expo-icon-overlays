# expo-icon-overlays

<a href="https://useffect.sh/seal/tsyirvo/expo-icon-overlays"><img align="right" width="120" src="https://useffect.sh/seal/tsyirvo/expo-icon-overlays.svg" alt="Maintained by useffect.sh"></a>

Add text banners and ribbons to Expo app icons during prebuild.
Use overlays to distinguish development, staging and production builds.
The plugin changes generated native icons, not your source images.

<table>
  <tr>
    <th></th>
    <th>Version banner</th>
    <th>Staging ribbon</th>
    <th>Banner and ribbon</th>
  </tr>
  <tr>
    <th>iOS</th>
    <td><img src="https://raw.githubusercontent.com/tsyirvo/expo-icon-overlays/main/docs/images/ios-banner.png" width="140" alt="iOS icon with a bottom v1.2.0 banner" /></td>
    <td><img src="https://raw.githubusercontent.com/tsyirvo/expo-icon-overlays/main/docs/images/ios-ribbon.png" width="140" alt="iOS icon with a top-right STAGING ribbon" /></td>
    <td><img src="https://raw.githubusercontent.com/tsyirvo/expo-icon-overlays/main/docs/images/ios-banner-ribbon.png" width="140" alt="iOS icon with a bottom v1.2.0 banner and a top-right STAGING ribbon" /></td>
  </tr>
  <tr>
    <th>Android</th>
    <td><img src="https://raw.githubusercontent.com/tsyirvo/expo-icon-overlays/main/docs/images/android-banner.png" width="140" alt="Android adaptive icon with a bottom v1.2.0 banner" /></td>
    <td><img src="https://raw.githubusercontent.com/tsyirvo/expo-icon-overlays/main/docs/images/android-ribbon.png" width="140" alt="Android adaptive icon with a top-right STAGING ribbon" /></td>
    <td><img src="https://raw.githubusercontent.com/tsyirvo/expo-icon-overlays/main/docs/images/android-banner-ribbon.png" width="140" alt="Android adaptive icon with a bottom v1.2.0 banner and a top-right STAGING ribbon" /></td>
  </tr>
</table>

This is a community package, not an official Expo package.

## Requirements

- Expo SDK 56, 57 or 58
- Node 22.13+, 24.3+ or 26+

## Install and configure

```sh
bun add expo-icon-overlays
```

Add the plugin to your existing `app.config.ts`:

```ts
import type { IconOverlayOptions } from "expo-icon-overlays";

const options = {
  overlays: [{ type: "banner", text: "DEV", background: "#D97706" }],
} satisfies IconOverlayOptions;

export default {
  expo: {
    name: "Example",
    slug: "example",
    plugins: [["expo-icon-overlays", options]],
  },
};
```

For production, set `enabled: false` or use `overlays: []`.
The [configuration guide](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/configuration.md#select-overlays-by-environment) shows how to pick overlays per environment.

To apply the overlays:

1. Run `bun expo prebuild`.
2. Create a new native build with your usual build command.

Repeat both steps whenever you change the options, including when you disable overlays.
You don't need `prebuild --clean`, which regenerates your native projects from scratch.

## Options

| Field                   | Default                                        | Values                                                                |
| ----------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| `enabled`               | `true`                                         | Boolean. `false` skips native changes.                                |
| `overlays`              | Required                                       | Array of overlays. An empty array changes no files.                   |
| `overlays[].type`       | Required                                       | `banner` or `ribbon`.                                                 |
| `overlays[].text`       | Required                                       | Letters, digits and punctuation. `{version}` inserts the app version. |
| `overlays[].position`   | Banner: `bottom`. Ribbon: `top-right`.         | Banner: `top`, `bottom`. Ribbon: `top-left`, `top-right`.             |
| `overlays[].background` | `#111111`                                      | `#RGB` or `#RRGGBB`.                                                  |
| `overlays[].color`      | Black or white, whichever has higher contrast. | `#RGB` or `#RRGGBB`. Tinted and monochrome icons use fixed colors.    |

Overlays draw in the order you list them, and each needs its own position.
You can't combine a top banner with a ribbon.
Text shrinks to fit. Keep it to about 7 capital letters; longer text can fail prebuild.
See [overlay rules](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/configuration.md#overlay-rules) and [text length](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/configuration.md#text-length) for details.

## Platform support

- **iOS:** light, dark and tinted PNG icons, and [Icon Composer](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/configuration.md#icon-composer-icon-folders) (`.icon`) folders with Xcode 26 or later.
- **Android:** legacy, round, adaptive and monochrome icons.
- Your source images, Android backgrounds and the web favicon are never changed.
- Icons need a new native build. OTA updates cannot change them.
- To install several variants side by side, give each one its own bundle identifier and package name. The plugin does not set them.

## Documentation

- [Configuration](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/configuration.md): environments, version text, supported text and Icon Composer.
- [Build caching](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/build-caching.md): how overlay text affects fingerprints and cached builds.
- [Development](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/development.md): contributor setup, checks and CI.
- [Rendering](https://github.com/tsyirvo/expo-icon-overlays/blob/main/docs/guides/rendering.md): layout rules, previews and reference images.

## License

Package code: MIT.

The bundled [Inter](https://rsms.me/inter/) subset is by Rasmus Andersson and contributors.
See [assets/Inter-LICENSE.txt](assets/Inter-LICENSE.txt) for the SIL Open Font License 1.1.
The rasterizer dependency, `@resvg/resvg-wasm`, supplies its WASM asset under its own MIT license.
