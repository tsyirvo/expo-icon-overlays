// Fits real glyph bounds inside the text box without distorting or truncating text.
import type { Layout } from "./layout";
import { measureSvg } from "./rasterize";
import { createSvg, createText } from "./svg";

const MEASUREMENT_FONT_SIZE_PX = 100;
const MEASUREMENT_CANVAS_SIZE_PX = 1024;
const HALF = 0.5;

export async function fitText(text: string, layout: Layout) {
  const bounds = await measureSvg(
    createSvg(
      MEASUREMENT_CANVAS_SIZE_PX,
      MEASUREMENT_CANVAS_SIZE_PX,
      createText(text, MEASUREMENT_FONT_SIZE_PX, "#000000")
    )
  );
  const scale = Math.min(
    layout.textWidth / bounds.width,
    layout.textHeight / bounds.height
  );
  const fontSize = MEASUREMENT_FONT_SIZE_PX * scale;
  if (fontSize < layout.minimumFontSize) {
    throw new Error(
      `overlays.text "${text}" does not fit at the minimum font size. Shorten the text.`
    );
  }
  return {
    fontSize,
    x: -(bounds.x + bounds.width * HALF) * scale,
    y: -(bounds.y + bounds.height * HALF) * scale,
  };
}
