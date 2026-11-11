# Rendering

Run these commands from the repository root.
See [development](development.md) for setup and required checks.

## Preview overlays

Supply a directory that contains these source PNG files:

- `ios-light.png`
- `ios-dark.png`
- `ios-tinted.png`
- `default.png`
- `adaptive-icon.png`

```sh
bun run preview -- /path/to/icons
```

Open `preview/index.html` to inspect all seven icon variants with short and long text.
Each sheet shows circle, squircle and rounded-square masks at full size and 60px.
`preview/contact-sheet.png` gives a compact overview.
All preview output stays ignored by Git.

## Review image references

Generate candidates:

```sh
bun scripts/render-references.ts
```

The command writes fourteen candidates and a review sheet to `preview/references/`.
Four candidates are transparent Icon Composer layers.
Inspect every candidate before accepting the images:

```sh
bun scripts/render-references.ts --accept
bun run test
```

The acceptance command replaces the committed images in `tests/references/`.
Tests compare exact pixels and write failed comparisons to `preview/diffs/`.

## README images

The README example icons in `docs/images/` come from the real stamping code.
Regenerate them after a rendering change:

```sh
bun scripts/render-readme-images.ts
```

The script draws the useffect.sh mark on its brand gradient.
iOS images use a rounded-square mask. Android images use the adaptive foreground surface in a circular launcher viewport.

## Preview Icon Composer appearances

Fixture checks inspect `.icon` layer pixels and metadata, not Apple's final rendering.
On macOS with Xcode 26 or later, render a copied folder from a prebuilt app in each appearance:

```sh
ICTOOL="$(xcode-select -p)/../Applications/Icon Composer.app/Contents/Executables/ictool"
for rendition in Default Dark TintedLight TintedDark ClearLight ClearDark; do
  "$ICTOOL" ios/<Project>/<Name>.icon --export-image --output-file "preview/$rendition.png" \
    --platform iOS --rendition "$rendition" --width 512 --height 512 --scale 1
done
```

CI runs on Linux and cannot run this check.

## Rendering rules

- The approved strip height is 20% of the layout height. The minimum font size is 8%.
- Square and round layouts use the full icon size.
- Adaptive and monochrome layouts use the 66/108 safe circle.
- Round overlays retain the source alpha.
- Adaptive previews show the launcher's 72/108 viewport.
- Tinted icons and tinted Icon Composer layers use white strips and black text.
- Icon Composer layers start fully transparent, so only the strips and text are visible.
- Monochrome icons use white strips with transparent text cutouts.
- Fully opaque icons are written without an alpha channel, because App Store Connect rejects one on large icons.

Rendering escapes SVG characters and preserves case and spacing.
Text shrinks to fit without truncation.
Text that cannot fit at the minimum size causes an error.
See [supported text](configuration.md#supported-text) for character ranges and token rules,
and [text length](configuration.md#text-length) for the fit limits.

## Regenerate the font

The committed font is an Inter v4.1 Bold subset with weight 700 and optical size 14.
The script checks the upstream font's SHA-256 before subsetting.
Inter omits U+0149. The script composes this glyph from Inter's apostrophe and `n` glyphs.

```sh
python3 -m venv /tmp/icon-overlays-font-tools
/tmp/icon-overlays-font-tools/bin/pip install fonttools==4.62.1
/tmp/icon-overlays-font-tools/bin/python scripts/subset-font.py
bun run test
```

Regeneration downloads the pinned upstream font and its license.
Review both files before committing them.
