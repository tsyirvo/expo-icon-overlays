# Rendering

How overlays are drawn, and how to preview and approve rendering changes.
Run these commands from the repository root.
See [development](development.md) for setup and required checks.

## Layout rules

- The strip height is 20% of the layout. The minimum font size is 8% of the layout.
- Square and round icons use the full icon as the layout.
- Android adaptive and monochrome icons use the safe circle, 66/108 of the canvas.
- Round icons keep the source icon's transparency.
- Tinted icons and tinted Icon Composer layers use a white strip and black text.
- Monochrome icons use a white strip with transparent text cut out of it.
- Fully opaque icons are saved without an alpha channel, because App Store Connect rejects one on large icons.

Text keeps its case and spacing, and SVG characters are escaped.
Text shrinks until it fits, down to the minimum font size.
The longest text that fits, as a multiple of the font size:

| Overlay | Square and tinted icons | Round, adaptive and monochrome icons |
| ------- | ----------------------- | ------------------------------------ |
| Banner  | 5.5                     | 4.75                                 |
| Ribbon  | 6.5                     | 5                                    |

Android always generates an adaptive foreground, so Android builds get the narrower limits.
See [text length](configuration.md#text-length) for the user-facing summary.

## Icon Composer layers

For an Icon Composer folder in `ios.icon`, Expo copies the folder into the iOS project.
The plugin changes only that copy:

- It adds `expo-icon-overlays.png` and `expo-icon-overlays-tinted.png` to the copy's `Assets/` folder.
  Each is a transparent 1024px PNG that covers the whole canvas, so only the strips and text show.
- It adds one group in front of the app's groups in the copy's `icon.json`, without glass or shadow.
- Default and dark appearances use your colors. Tinted and clear appearances use the tinted layer.
- It rebuilds the copy's `icon.json` from the source on every prebuild, so overlays never stack up.

Prebuild fails when:

- The source folder or its `icon.json` is missing.
- The source `Assets/` folder already uses one of the two layer file names.
- The source already has four visible groups. Xcode rejects a fifth.

When the plugin is disabled, it changes no files. The copy keeps both layer files until `prebuild --clean`,
but the restored `icon.json` no longer uses them.

## Preview overlays

Put these source PNG files in one folder:

- `ios-light.png`
- `ios-dark.png`
- `ios-tinted.png`
- `default.png`
- `adaptive-icon.png`

```sh
bun run preview -- /path/to/icons
```

Open `preview/index.html` to see all seven icon types with short and long text.
Each sheet shows circle, squircle and rounded-square masks at full size and at 60px.
`preview/contact-sheet.png` gives a compact overview.
Git ignores everything in `preview/`.

## Preview Icon Composer appearances

Fixture checks inspect `.icon` layer pixels and metadata, not Apple's final rendering.
To see the final result, you need macOS with Xcode 26 or later. Render a copied folder from a prebuilt app in each appearance:

```sh
ICTOOL="$(xcode-select -p)/../Applications/Icon Composer.app/Contents/Executables/ictool"
for rendition in Default Dark TintedLight TintedDark ClearLight ClearDark; do
  "$ICTOOL" ios/<Project>/<Name>.icon --export-image --output-file "preview/$rendition.png" \
    --platform iOS --rendition "$rendition" --width 512 --height 512 --scale 1
done
```

CI runs on Linux, so it cannot run this check.

## Update reference images

Tests compare rendered icons with committed images in `tests/references/`, pixel for pixel.
After a rendering change, generate new candidates:

```sh
bun scripts/render-references.ts
```

This writes fourteen candidates and a review sheet to `preview/references/`.
Four of them are transparent Icon Composer layers.
Inspect every candidate, then accept them:

```sh
bun scripts/render-references.ts --accept
bun run test
```

Failed comparisons are written to `preview/diffs/`.

## README images

The README example icons in `docs/images/` come from the real stamping code.
Regenerate them after a rendering change:

```sh
bun scripts/render-readme-images.ts
```

The script draws the useffect.sh mark on its brand gradient.
iOS images use a rounded-square mask. Android images show the adaptive foreground in a circular launcher viewport.

## Regenerate the font

The committed font is an Inter v4.1 Bold subset (weight 700, optical size 14).
The script checks the upstream font's SHA-256 before subsetting.
Inter has no U+0149 glyph, so the script builds it from Inter's apostrophe and `n`.

```sh
python3 -m venv /tmp/icon-overlays-font-tools
/tmp/icon-overlays-font-tools/bin/pip install fonttools==4.62.1
/tmp/icon-overlays-font-tools/bin/python scripts/subset-font.py
bun run test
```

The script downloads the pinned upstream font and its license.
Review both files before you commit them.
