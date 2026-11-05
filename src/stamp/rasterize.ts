// Loads package rendering assets once and releases WASM objects after each operation.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const requireAsset = createRequire(import.meta.url);
let assetsPromise: ReturnType<typeof initializeRasterizer> | undefined;

async function initializeRasterizer() {
  const rasterizer = await import("@resvg/resvg-wasm");
  const [wasm, font] = await Promise.all([
    readFile(requireAsset.resolve("@resvg/resvg-wasm/index_bg.wasm")),
    readFile(
      join(
        dirname(requireAsset.resolve("expo-icon-overlays/package.json")),
        "assets/Inter-Bold.ttf"
      )
    ),
  ]);
  await rasterizer.initWasm(wasm);
  return { font, rasterizer };
}

async function createRenderer(svg: string) {
  assetsPromise ??= initializeRasterizer();
  const { rasterizer, font } = await assetsPromise;
  return new rasterizer.Resvg(svg, {
    font: { defaultFontFamily: "Inter", fontBuffers: [font] },
  });
}

export async function rasterizeSvg(svg: string): Promise<Buffer> {
  const renderer = await createRenderer(svg);
  try {
    const image = renderer.render();
    try {
      return Buffer.from(image.pixels);
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}

export async function measureSvg(svg: string) {
  const renderer = await createRenderer(svg);
  try {
    const bounds = renderer.getBBox();
    if (!bounds) {
      throw new Error(
        "overlays.text has no drawable glyphs. Supply visible supported text."
      );
    }
    try {
      return {
        height: bounds.height,
        width: bounds.width,
        x: bounds.x,
        y: bounds.y,
      };
    } finally {
      bounds.free();
    }
  } finally {
    renderer.free();
  }
}
