// Compares stamped pixels with inspected references for each surface and overlay type.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { expect, it } from "vitest";
import { parseOptions } from "../src/options/index";
import { stampIcon } from "../src/stamp/index";
import { createReferenceIcon, RENDER_CASES } from "./render-cases";

it.concurrent.each(RENDER_CASES)(
  "renders literal text and approved geometry for $name",
  async (example) => {
    const { overlays } = parseOptions({ overlays: example.overlays });
    const output = await stampIcon(
      createReferenceIcon(),
      overlays,
      example.surface
    );
    const actual = PNG.sync.read(output);
    const expected = PNG.sync.read(
      await readFile(
        new URL(`./references/${example.name}.png`, import.meta.url)
      )
    );
    expect([actual.width, actual.height]).toEqual([
      expected.width,
      expected.height,
    ]);
    const diff = new PNG({ height: actual.height, width: actual.width });
    const changedPixels = pixelmatch(
      actual.data,
      expected.data,
      diff.data,
      actual.width,
      actual.height,
      // biome-ignore lint/style/useNamingConvention: pixelmatch names this option includeAA.
      { includeAA: true, threshold: 0 }
    );
    if (changedPixels > 0) {
      await mkdir("preview/diffs", { recursive: true });
      await writeFile(`preview/diffs/${example.name}-actual.png`, output);
      await writeFile(
        `preview/diffs/${example.name}-diff.png`,
        PNG.sync.write(diff)
      );
    }
    expect(changedPixels).toBe(0);
  }
);
