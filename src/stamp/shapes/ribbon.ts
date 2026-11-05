// Draws a diagonal ribbon that reaches both edges of its corner.
import type { Layout } from "../layout";

const HALF = 0.5;

export function createRibbon(layout: Layout, background: string): string {
  return `<path transform="translate(${layout.centerX} ${layout.centerY}) rotate(${layout.angle})" d="M ${-layout.stripWidth * HALF} ${-layout.stripHeight * HALF} H ${layout.stripWidth * HALF} V ${layout.stripHeight * HALF} H ${-layout.stripWidth * HALF} Z" fill="${background}"/>`;
}
