// Encodes literal text and drawing fragments as SVG documents.
const FONT_WEIGHT = 700;

function escapeText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
