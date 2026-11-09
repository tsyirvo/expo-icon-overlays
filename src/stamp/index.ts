// Draws ordered overlays onto a PNG icon or a transparent layer using the selected surface's drawing rules.
import { PNG } from "pngjs";
import type { Overlay, Surface } from "../types";
import { blendPixels } from "./blend";
import { selectTextColor } from "./contrast";
import { calculateLayout } from "./layout";
import { decodePng, encodePng } from "./png";
import { rasterizeSvg } from "./rasterize";
import { createStrip, createStripText, createSvg } from "./svg";
import { fitText } from "./text-fit";

async function drawOverlays(
  image: PNG,
  overlays: readonly Overlay[],
  surface: Surface
): Promise<void> {
  for (const overlay of overlays) {
    const layout = calculateLayout(image.width, image.height, overlay, surface);
    // biome-ignore lint/performance/noAwaitInLoops: Compose in array order without retaining extra full-size layers.
    const fitted = await fitText(overlay.text, layout);
    const isMonochrome = surface === "monochrome";
    const hasFixedColors = isMonochrome || surface === "square-tinted";
    const background = hasFixedColors ? "#FFFFFF" : overlay.background;
    const color = hasFixedColors
      ? "#000000"
      : (overlay.color ?? selectTextColor(background));
    const strip = createStrip(layout, background);
    const text = createStripText(overlay.text, layout, fitted, color);
    if (isMonochrome) {
      blendPixels(
        image.data,
        await rasterizeSvg(createSvg(image.width, image.height, strip)),
        "over"
      );
      blendPixels(
        image.data,
        await rasterizeSvg(createSvg(image.width, image.height, text)),
        "erase"
      );
    } else {
      const pixels = await rasterizeSvg(
        createSvg(image.width, image.height, strip + text)
      );
      blendPixels(image.data, pixels, surface === "round" ? "atop" : "over");
    }
  }
}

export async function stampIcon(
  png: Uint8Array,
  overlays: readonly Overlay[],
  surface: Surface
): Promise<Buffer> {
  if (overlays.length === 0) {
    return Buffer.from(png);
  }
  const image = decodePng(png);
  await drawOverlays(image, overlays, surface);
  return encodePng(image);
}

export async function renderOverlayLayer(
  sizePx: number,
  overlays: readonly Overlay[],
  surface: Surface
): Promise<Buffer> {
  // pngjs zero-fills new images, so every pixel outside the overlays stays transparent.
  const layer = new PNG({ height: sizePx, width: sizePx });
  await drawOverlays(layer, overlays, surface);
  return encodePng(layer);
}
