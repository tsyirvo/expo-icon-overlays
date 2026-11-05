// Renders real input icons into full-size masked sheets and a compact review image.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import { parseOptions } from "../src/options/index";
import { stampIcon } from "../src/stamp/index";
import type { IconOverlay, Surface } from "../src/types";

const OUTPUT_DIRECTORY = "preview";
const SMALL_ICON_SIZE_PX = 60;
const REVIEW_ICON_SIZE_PX = 180;
const CELL_GAP_PX = 24;
const CAPTION_HEIGHT_PX = 36;
const TEXT_BASELINE_PX = 24;
const CAPTION_FONT_SIZE_PX = 18;
const CAPTION_ROW_COUNT = 2;
const MASK_COUNT = 3;
const ADAPTIVE_VIEWPORT_RATIO = 108 / 72;
const HALF = 0.5;
const CHANNELS_PER_PIXEL = 4;
const ALPHA_CHANNEL = 3;
const ICONS: { name: string; file: string; surface: Surface }[] = [
  { file: "ios-light.png", name: "ios-light", surface: "square" },
  { file: "ios-dark.png", name: "ios-dark", surface: "square" },
  { file: "ios-tinted.png", name: "ios-tinted", surface: "square-tinted" },
  { file: "default.png", name: "android-legacy", surface: "square" },
  { file: "default.png", name: "android-round", surface: "round" },
  {
    file: "adaptive-icon.png",
    name: "android-foreground",
    surface: "adaptive-foreground",
  },
  {
    file: "adaptive-icon.png",
    name: "android-monochrome",
    surface: "monochrome",
  },
];
const EXAMPLES: { name: string; overlays: IconOverlay[] }[] = [
  {
    name: "short",
    overlays: [
      { background: "#2563EB", text: "DEV", type: "banner" },
      { text: "1.0", type: "ribbon" },
    ],
  },
  {
    name: "long",
    overlays: [
      { background: "#D97706", text: "STAGING", type: "banner" },
      { text: "2.3.0-rc", type: "ribbon" },
    ],
  },
];

function clipRoundInput(bytes: Buffer): Buffer {
  const icon = PNG.sync.read(bytes);
  for (let y = 0; y < icon.height; y += 1) {
    for (let x = 0; x < icon.width; x += 1) {
      if (
        Math.hypot(
          (x + HALF) / icon.width - HALF,
          (y + HALF) / icon.height - HALF
        ) > HALF
      ) {
        icon.data[(y * icon.width + x) * CHANNELS_PER_PIXEL + ALPHA_CHANNEL] =
          0;
      }
    }
  }
  return PNG.sync.write(icon);
}

function createMasks(size: number): string[] {
  const center = size * HALF;
  const squircleControlRatio = 0.04;
  const control = size * squircleControlRatio;
  const roundedCornerRatio = 0.22;
  return [
    `<circle cx="${center}" cy="${center}" r="${center}"/>`,
    `<path d="M ${center} 0 C ${size - control} 0 ${size} ${control} ${size} ${center} C ${size} ${size - control} ${size - control} ${size} ${center} ${size} C ${control} ${size} 0 ${size - control} 0 ${center} C 0 ${control} ${control} 0 ${center} 0 Z"/>`,
    `<rect width="${size}" height="${size}" rx="${size * roundedCornerRatio}"/>`,
  ];
}

function createMaskedRow(
  bytes: Buffer,
  surface: Surface,
  size: number,
  prefix: string
): string {
  const zoom =
    surface === "adaptive-foreground" || surface === "monochrome"
      ? ADAPTIVE_VIEWPORT_RATIO
      : 1;
  const imageSize = size * zoom;
  const offset = (size - imageSize) * HALF;
  return createMasks(size)
    .map((mask, index) => {
      const id = `${prefix}-${index}`;
      const x = index * (size + CELL_GAP_PX);
      return `<g transform="translate(${x} 0)"><defs><clipPath id="${id}">${mask}</clipPath></defs><g clip-path="url(#${id})"><rect width="${size}" height="${size}" fill="#52525b"/><image x="${offset}" y="${offset}" width="${imageSize}" height="${imageSize}" href="data:image/png;base64,${bytes.toString("base64")}"/></g></g>`;
    })
    .join("");
}

async function renderSheet(svg: string, file: string): Promise<void> {
  // stampIcon already initialized this concrete WASM module in this process.
  const { Resvg } = await import("@resvg/resvg-wasm");
  const font = await readFile("assets/Inter-Bold.ttf");
  const renderer = new Resvg(svg, { font: { fontBuffers: [font] } });
  try {
    const image = renderer.render();
    try {
      await writeFile(join(OUTPUT_DIRECTORY, file), image.asPng());
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}

async function main(): Promise<void> {
  const [inputDirectory] = process.argv
    .slice(2)
    .filter((argument) => argument !== "--");
  if (!inputDirectory) {
    throw new Error(
      "icons-directory is missing. Run bun run preview -- <starter-assets/icons-directory>."
    );
  }
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const reviewRows: string[] = [];
  const links: string[] = [];
  for (const icon of ICONS) {
    // biome-ignore lint/performance/noAwaitInLoops: Keep only one icon's full-resolution sheets in memory.
    const bytes = await readFile(join(inputDirectory, icon.file));
    const input = icon.surface === "round" ? clipRoundInput(bytes) : bytes;
    const { width, height } = PNG.sync.read(input);
    for (const example of EXAMPLES) {
      const { overlays } = parseOptions({ overlays: example.overlays });
      // biome-ignore lint/performance/noAwaitInLoops: Bound memory while generating full-resolution review images.
      const stamped = await stampIcon(input, overlays, icon.surface);
      const name = `${icon.name}-${example.name}`;
      await writeFile(join(OUTPUT_DIRECTORY, `${name}.png`), stamped);
      const fullWidth = MASK_COUNT * (width + CELL_GAP_PX);
      const fullHeight =
        height + SMALL_ICON_SIZE_PX + CAPTION_HEIGHT_PX * CAPTION_ROW_COUNT;
      const full = `<svg xmlns="http://www.w3.org/2000/svg" width="${fullWidth}" height="${fullHeight}"><rect width="100%" height="100%" fill="#e4e4e7"/><text x="0" y="${TEXT_BASELINE_PX}" font-family="Inter" font-size="${CAPTION_FONT_SIZE_PX}">${name}: circle / squircle / rounded square. Full size, then 60px.</text><g transform="translate(0 ${CAPTION_HEIGHT_PX})">${createMaskedRow(stamped, icon.surface, width, `${name}-full`)}</g><g transform="translate(0 ${height + CAPTION_HEIGHT_PX * CAPTION_ROW_COUNT})">${createMaskedRow(stamped, icon.surface, SMALL_ICON_SIZE_PX, `${name}-small`)}</g></svg>`;
      await renderSheet(full, `${name}-masks.png`);
      links.push(
        `<li><a href="${name}-masks.png">${name}: ${width}px and 60px under all three masks</a></li>`
      );
      const rowY =
        reviewRows.length *
        (REVIEW_ICON_SIZE_PX + CAPTION_HEIGHT_PX + CELL_GAP_PX);
      const smallX = MASK_COUNT * (REVIEW_ICON_SIZE_PX + CELL_GAP_PX);
      reviewRows.push(
        `<g transform="translate(0 ${rowY})"><text y="${TEXT_BASELINE_PX}" font-family="Inter" font-size="${CAPTION_FONT_SIZE_PX}">${name}</text><g transform="translate(0 ${CAPTION_HEIGHT_PX})">${createMaskedRow(stamped, icon.surface, REVIEW_ICON_SIZE_PX, `${name}-review`)}</g><g transform="translate(${smallX} ${CAPTION_HEIGHT_PX})">${createMaskedRow(stamped, icon.surface, SMALL_ICON_SIZE_PX, `${name}-tiny`)}</g></g>`
      );
    }
  }
  const reviewWidth =
    MASK_COUNT * (REVIEW_ICON_SIZE_PX + SMALL_ICON_SIZE_PX + CELL_GAP_PX * 2);
  const reviewHeight =
    reviewRows.length * (REVIEW_ICON_SIZE_PX + CAPTION_HEIGHT_PX + CELL_GAP_PX);
  await renderSheet(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${reviewWidth}" height="${reviewHeight}"><rect width="100%" height="100%" fill="#e4e4e7"/>${reviewRows.join("")}</svg>`,
    "contact-sheet.png"
  );
  await writeFile(
    join(OUTPUT_DIRECTORY, "index.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Icon overlay review</title><h1>Icon overlay review</h1><p>Strip: 20% of the layout height. Minimum font: 8% of the layout height. Round layout: full circle. Adaptive and monochrome layout: 66/108 of the canvas. Android adaptive masks use the 72/108 viewport.</p><p>Left: 180px review. Right: 60px. Mask order: circle, squircle, rounded square. Full-size sheets appear below.</p><img src="contact-sheet.png" alt="Icon overlay contact sheet"><ul>${links.join("")}</ul></html>`
  );
  console.info(
    "Review preview/index.html and preview/contact-sheet.png before approving rendering sizes."
  );
}

await main();
