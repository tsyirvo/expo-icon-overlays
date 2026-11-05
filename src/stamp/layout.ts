// Places full and safe overlay strips and their text boxes in icon coordinates.
import type { Overlay, Surface } from "../types";

const STRIP_HEIGHT_RATIO = 0.2;
const SAFE_DIAMETER_RATIO = 66 / 108;
const BANNER_TEXT_WIDTH_RATIO = 0.44;
const SAFE_BANNER_TEXT_WIDTH_RATIO = 0.38;
const RIBBON_TEXT_WIDTH_RATIO = 0.52;
const SAFE_RIBBON_TEXT_WIDTH_RATIO = 0.4;
const FULL_RIBBON_OFFSET_RATIO = 0.25;
const SAFE_RIBBON_OFFSET_RATIO = 0.28;
const TEXT_HEIGHT_RATIO = 0.62;
const MINIMUM_FONT_SIZE_RATIO = 0.08;
const HALF = 0.5;
const QUARTER_TURN_DEGREES = 90;

export interface Layout {
  angle: number;
  centerX: number;
  centerY: number;
  minimumFontSize: number;
  stripHeight: number;
  stripWidth: number;
  textHeight: number;
  textWidth: number;
}

export function calculateLayout(
  width: number,
  height: number,
  overlay: Overlay,
  surface: Surface
): Layout {
  const size = Math.min(width, height);
  const isSafe = surface !== "square" && surface !== "square-tinted";
  const hasAdaptivePadding =
    surface === "adaptive-foreground" || surface === "monochrome";
  const layoutSize = size * (hasAdaptivePadding ? SAFE_DIAMETER_RATIO : 1);
  const stripHeight = layoutSize * STRIP_HEIGHT_RATIO;
  const centerX = width * HALF;
  const centerY = height * HALF;
  const base = {
    minimumFontSize: layoutSize * MINIMUM_FONT_SIZE_RATIO,
    stripHeight,
    stripWidth: Math.hypot(width, height),
    textHeight: stripHeight * TEXT_HEIGHT_RATIO,
  };
  if (overlay.type === "banner") {
    const offset = ((isSafe ? layoutSize : height) - stripHeight) * HALF;
    return {
      ...base,
      angle: 0,
      centerX,
      centerY: centerY + (overlay.position === "top" ? -offset : offset),
      textWidth:
        layoutSize *
        (isSafe ? SAFE_BANNER_TEXT_WIDTH_RATIO : BANNER_TEXT_WIDTH_RATIO),
    };
  }
  const offset = isSafe
    ? layoutSize * SAFE_RIBBON_OFFSET_RATIO
    : size * FULL_RIBBON_OFFSET_RATIO;
  const isLeft = overlay.position === "top-left";
  return {
    ...base,
    angle: (isLeft ? -1 : 1) * QUARTER_TURN_DEGREES * HALF,
    centerX: centerX + (isLeft ? -offset : offset),
    centerY: centerY - offset,
    textWidth:
      layoutSize *
      (isSafe ? SAFE_RIBBON_TEXT_WIDTH_RATIO : RIBBON_TEXT_WIDTH_RATIO),
  };
}
