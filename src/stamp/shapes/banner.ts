// Draws a horizontal banner across the icon canvas.
import type { Layout } from "../layout";

const HALF = 0.5;

export function createBanner(layout: Layout, background: string): string {
  return `<rect x="${layout.centerX - layout.stripWidth * HALF}" y="${layout.centerY - layout.stripHeight * HALF}" width="${layout.stripWidth}" height="${layout.stripHeight}" fill="${background}"/>`;
}
