// Supplies fixed icon pixels and overlay examples for reviewed image regressions.
import { PNG } from "pngjs";
import type { IconOverlay, Surface } from "../src/types";

const ICON_SIZE_PX = 216;
const CHANNELS_PER_PIXEL = 4;
const MAXIMUM_CHANNEL = 255;
const HALF = 0.5;
const CIRCLE_RADIUS_PX = 100;
const EDGE_WIDTH_PX = 2;
const LOGO_RADIUS_PX = 48;
const SURFACES: Surface[] = [
  "square",
  "square-tinted",
  "round",
  "adaptive-foreground",
  "monochrome",
];
const OVERLAY_EXAMPLES: { type: string; overlays: IconOverlay[] }[] = [
  {
    overlays: [
      {
        background: "#2563EB",
        position: "top",
        text: "Été 1.2",
        type: "banner",
      },
      { background: "#D97706", text: "DEV & QA", type: "banner" },
    ],
    type: "banner",
  },
  {
    overlays: [
      {
        background: "#2563EB",
        position: "top-left",
        text: "<DEV>",
        type: "ribbon",
      },
      {
        background: "#D97706",
        color: "#FFFFFF",
        text: "1.2.3",
        type: "ribbon",
      },
    ],
    type: "ribbon",
  },
];

export const RENDER_CASES = SURFACES.flatMap((surface) =>
  OVERLAY_EXAMPLES.map((example) => ({
    name: `${surface}-${example.type}`,
    overlays: example.overlays,
    surface,
  }))
);

export function createReferenceIcon(): Buffer {
  const icon = new PNG({ height: ICON_SIZE_PX, width: ICON_SIZE_PX });
  for (let y = 0; y < ICON_SIZE_PX; y += 1) {
    for (let x = 0; x < ICON_SIZE_PX; x += 1) {
      const distance = Math.hypot(
        x + HALF - ICON_SIZE_PX * HALF,
        y + HALF - ICON_SIZE_PX * HALF
      );
      const alpha = Math.round(
        MAXIMUM_CHANNEL *
          Math.max(
            0,
            Math.min(1, (CIRCLE_RADIUS_PX - distance) / EDGE_WIDTH_PX)
          )
      );
      const color = distance < LOGO_RADIUS_PX ? [230, 240, 250] : [30, 60, 90];
      icon.data.set(
        [...color, alpha],
        (y * ICON_SIZE_PX + x) * CHANNELS_PER_PIXEL
      );
    }
  }
  return PNG.sync.write(icon);
}
