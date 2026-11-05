// Updates only discovered native icons and attaches file paths to rendering failures.
import { readFile, writeFile } from "node:fs/promises";
import type { Overlay, Surface } from "../types";

export interface IconTarget {
  path: string;
  surface: Surface;
}

async function readIcon(path: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      throw new Error(
        `${path}: expected icon file is missing. Run Expo prebuild to regenerate native icons and check plugin ordering.`,
        { cause }
      );
    }
    throw cause;
  }
}

export async function updateIconTargets(
  targets: IconTarget[],
  overlays: Overlay[]
): Promise<void> {
  const { stampIcon } = await import("../stamp/index");
  // Render every image before writing so a rendering failure leaves all icons untouched.
  // A failed write can still leave some icons stamped, and the next prebuild regenerates them.
  const updates = await Promise.all(
    targets.map(async (target) => {
      const bytes = await readIcon(target.path);
      try {
        return {
          bytes: await stampIcon(bytes, overlays, target.surface),
          path: target.path,
        };
      } catch (cause) {
        const problem = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`${target.path}: ${problem}`, { cause });
      }
    })
  );
  await Promise.all(
    updates.map((update) => writeFile(update.path, update.bytes))
  );
}
