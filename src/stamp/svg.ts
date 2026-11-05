// Encodes literal text and laid-out overlay strips as SVG documents.
import type { Layout } from "./layout";

const FONT_WEIGHT = 700;
const HALF = 0.5;

interface FittedText {
  fontSize: number;
  x: number;
  y: number;
}

function escapeText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createStripTransform(layout: Layout): string {
  return `translate(${layout.centerX} ${layout.centerY}) rotate(${layout.angle})`;
}

export function createSvg(
  width: number,
  height: number,
  content: string
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
}

export function createText(
  text: string,
  fontSize: number,
  color: string
): string {
  return `<text xml:space="preserve" style="white-space:pre" font-family="Inter" font-weight="${FONT_WEIGHT}" font-size="${fontSize}" fill="${color}">${escapeText(text)}</text>`;
}

export function createStrip(layout: Layout, background: string): string {
  const halfWidth = layout.stripWidth * HALF;
  const halfHeight = layout.stripHeight * HALF;
  return `<path transform="${createStripTransform(layout)}" d="M ${-halfWidth} ${-halfHeight} H ${halfWidth} V ${halfHeight} H ${-halfWidth} Z" fill="${background}"/>`;
}

export function createStripText(
  text: string,
  layout: Layout,
  fitted: FittedText,
  color: string
): string {
  return `<g transform="${createStripTransform(layout)}"><g transform="translate(${fitted.x} ${fitted.y})">${createText(text, fitted.fontSize, color)}</g></g>`;
}
