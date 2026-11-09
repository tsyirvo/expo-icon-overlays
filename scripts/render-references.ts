// Renders image-reference candidates and accepts them only through an explicit command.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { RENDER_CASES, renderCase } from "../tests/render-cases";

const TILE_SIZE_PX = 240;
const ICON_SIZE_PX = 216;
const COLUMN_COUNT = 2;
const TEXT_BASELINE_PX = 18;
const CAPTION_HEIGHT_PX = 24;
const FONT_SIZE_PX = 12;
const SHEET_WIDTH_PX = COLUMN_COUNT * TILE_SIZE_PX;
const SHEET_HEIGHT_PX =
  Math.ceil(RENDER_CASES.length / COLUMN_COUNT) * TILE_SIZE_PX;

const outputDirectory = process.argv.includes("--accept")
  ? "tests/references"
  : "preview/references";
await mkdir(outputDirectory, { recursive: true });
const tiles = await Promise.all(
  RENDER_CASES.map(async (example, index) => {
    const png = await renderCase(example);
    await writeFile(join(outputDirectory, `${example.name}.png`), png);
    const x = (index % COLUMN_COUNT) * TILE_SIZE_PX;
    const y = Math.floor(index / COLUMN_COUNT) * TILE_SIZE_PX;
    return `<g transform="translate(${x} ${y})"><text y="${TEXT_BASELINE_PX}" font-family="Inter" font-size="${FONT_SIZE_PX}">${example.name}</text><image y="${CAPTION_HEIGHT_PX}" width="${ICON_SIZE_PX}" height="${ICON_SIZE_PX}" href="data:image/png;base64,${png.toString("base64")}"/></g>`;
  })
);
// Reuse the WASM instance initialized by the stamp module for the review sheet.
const { Resvg } = await import("@resvg/resvg-wasm");
const renderer = new Resvg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_WIDTH_PX}" height="${SHEET_HEIGHT_PX}"><rect width="100%" height="100%" fill="#a1a1aa"/>${tiles.join("")}</svg>`,
  {
    font: { fontBuffers: [await readFile("assets/Inter-Bold.ttf")] },
  }
);
try {
  const sheet = renderer.render();
  try {
    await mkdir("preview/references", { recursive: true });
    await writeFile("preview/references/contact-sheet.png", sheet.asPng());
  } finally {
    sheet.free();
  }
} finally {
  renderer.free();
}
console.info(
  `Rendered image references to ${outputDirectory}. Inspect every candidate before using --accept.`
);
