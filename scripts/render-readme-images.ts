// Renders the README example icons with the real stamping code and platform launcher masks.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseOptions } from "../src/options/index";
import { renderOverlayLayer, stampIcon } from "../src/stamp/index";
import type { IconOverlay } from "../src/types";

const OUTPUT_DIRECTORY = "docs/images";
const SOURCE_SIZE_PX = 1024;
const OUTPUT_SIZE_PX = 320;
const GLYPH_VIEWBOX_PX = 48;
const IOS_GLYPH_SIZE_PX = 635;
const ADAPTIVE_GLYPH_SIZE_PX = 430;
const IOS_CORNER_RATIO = 0.2237;
const ADAPTIVE_VIEWPORT_RATIO = 108 / 72;
const HALF = 0.5;
// useffect.sh mark: one capsule repeated at four 90deg rotations.
const CAPSULES = [
  [20.45, 12.3, -45],
  [35.7, 20.45, 45],
  [27.55, 35.7, -45],
  [12.3, 27.55, 45],
];
const BACKGROUND = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B8F76"/><stop offset="0.45" stop-color="#5CE0B3"/><stop offset="1" stop-color="#FF8566"/></linearGradient></defs><rect width="${SOURCE_SIZE_PX}" height="${SOURCE_SIZE_PX}" fill="url(#bg)"/>`;
const BANNER: IconOverlay = {
  background: "#082E2B",
  color: "#F6F0E7",
  text: "v1.2.0",
  type: "banner",
};
const RIBBON: IconOverlay = {
  background: "#FF8566",
  color: "#082E2B",
  text: "STAGING",
  type: "ribbon",
};
const EXAMPLES: { name: string; overlays: IconOverlay[] }[] = [
  { name: "banner", overlays: [BANNER] },
  { name: "ribbon", overlays: [RIBBON] },
  { name: "banner-ribbon", overlays: [BANNER, RIBBON] },
];

function createGlyph(size: number): string {
  const scale = size / GLYPH_VIEWBOX_PX;
  const offset = (SOURCE_SIZE_PX - size) * HALF;
  const capsules = CAPSULES.map(
    ([x, y, angle]) =>
      `<rect x="-10" y="-5" width="20" height="10" rx="5" transform="translate(${x} ${y}) rotate(${angle})"/>`
  ).join("");
  return `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="#F6F0E7">${capsules}</g>`;
}

function createSvg(size: number, content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${content}</svg>`;
}

function embedPng(bytes: Buffer, position: number, size: number): string {
  return `<image x="${position}" y="${position}" width="${size}" height="${size}" href="data:image/png;base64,${bytes.toString("base64")}"/>`;
}

async function renderPng(svg: string): Promise<Buffer> {
  // Reuse the WASM instance initialized by the stamp module at startup.
  const { Resvg } = await import("@resvg/resvg-wasm");
  const renderer = new Resvg(svg);
  try {
    const image = renderer.render();
    try {
      return Buffer.from(image.asPng());
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}

async function renderIos(overlays: IconOverlay[]): Promise<Buffer> {
  const source = await renderPng(
    createSvg(SOURCE_SIZE_PX, BACKGROUND + createGlyph(IOS_GLYPH_SIZE_PX))
  );
  const stamped = await stampIcon(
    source,
    parseOptions({ overlays }).overlays,
    "square"
  );
  const corner = SOURCE_SIZE_PX * IOS_CORNER_RATIO;
  return renderPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE_PX}" height="${OUTPUT_SIZE_PX}" viewBox="0 0 ${SOURCE_SIZE_PX} ${SOURCE_SIZE_PX}"><defs><clipPath id="mask"><rect width="${SOURCE_SIZE_PX}" height="${SOURCE_SIZE_PX}" rx="${corner}"/></clipPath></defs><g clip-path="url(#mask)">${embedPng(stamped, 0, SOURCE_SIZE_PX)}</g></svg>`
  );
}

async function renderAndroid(overlays: IconOverlay[]): Promise<Buffer> {
  const foreground = await renderPng(
    createSvg(SOURCE_SIZE_PX, createGlyph(ADAPTIVE_GLYPH_SIZE_PX))
  );
  const stamped = await stampIcon(
    foreground,
    parseOptions({ overlays }).overlays,
    "adaptive-foreground"
  );
  // Launchers show the central 72/108 of the adaptive layers inside their mask.
  const layerSize = SOURCE_SIZE_PX * ADAPTIVE_VIEWPORT_RATIO;
  const layerPosition = (SOURCE_SIZE_PX - layerSize) * HALF;
  const center = SOURCE_SIZE_PX * HALF;
  return renderPng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE_PX}" height="${OUTPUT_SIZE_PX}" viewBox="0 0 ${SOURCE_SIZE_PX} ${SOURCE_SIZE_PX}"><defs><clipPath id="mask"><circle cx="${center}" cy="${center}" r="${center}"/></clipPath></defs><g clip-path="url(#mask)">${BACKGROUND}${embedPng(stamped, layerPosition, layerSize)}</g></svg>`
  );
}

// Rendering one overlay layer initializes the stamp module's WASM before the source icons are drawn.
await renderOverlayLayer(
  SOURCE_SIZE_PX,
  parseOptions({ overlays: EXAMPLES[0]?.overlays ?? [] }).overlays,
  "square"
);
await mkdir(OUTPUT_DIRECTORY, { recursive: true });
for (const example of EXAMPLES) {
  // biome-ignore lint/performance/noAwaitInLoops: Keep one example's full-size layers in memory.
  const [ios, android] = await Promise.all([
    renderIos(example.overlays),
    renderAndroid(example.overlays),
  ]);
  await writeFile(join(OUTPUT_DIRECTORY, `ios-${example.name}.png`), ios);
  await writeFile(
    join(OUTPUT_DIRECTORY, `android-${example.name}.png`),
    android
  );
}
console.info(`Rendered README images to ${OUTPUT_DIRECTORY}.`);
