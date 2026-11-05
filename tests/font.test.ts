// Checks that the shipped font cannot silently replace a supported character with a missing glyph.
import { openSync } from "fontkit";
import { expect, it } from "vitest";

const BASIC_LATIN_START = 0x20;
const BASIC_LATIN_END = 0x7e;
const LATIN_SUPPLEMENT_START = 0xa0;
const LATIN_EXTENDED_END = 0x1_7f;
const SOFT_HYPHEN = 0xad;

it("contains each supported character in the committed font", () => {
  const font = openSync(
    new URL("../assets/Inter-Bold.ttf", import.meta.url).pathname
  );
  if (!("hasGlyphForCodePoint" in font)) {
    throw new Error(
      "Inter-Bold.ttf must be a single font, not a font collection."
    );
  }
  const points = [
    ...Array.from(
      { length: BASIC_LATIN_END - BASIC_LATIN_START + 1 },
      (_value, index) => BASIC_LATIN_START + index
    ),
    ...Array.from(
      { length: LATIN_EXTENDED_END - LATIN_SUPPLEMENT_START + 1 },
      (_value, index) => LATIN_SUPPLEMENT_START + index
    ),
  ].filter((point) => point !== SOFT_HYPHEN);
  expect(points.filter((point) => !font.hasGlyphForCodePoint(point))).toEqual(
    []
  );
});
