// Renders every discovered icon target before writing, and attaches file paths to rendering failures.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Overlay, Surface } from "../types";
import {
  createIconFolderWrites,
  type FileWrite,
  type IconFolderTarget,
} from "./icon-folder";

interface PngIconTarget {
  kind: "png";
  path: string;
  surface: Surface;
}

export type IconTarget = PngIconTarget | IconFolderTarget;

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

async function createPngWrite(
  target: PngIconTarget,
  overlays: Overlay[]
): Promise<FileWrite> {
  const { stampIcon } = await import("../stamp/index");
  const bytes = await readIcon(target.path);
  try {
    return {
      contents: await stampIcon(bytes, overlays, target.surface),
      path: target.path,
    };
  } catch (cause) {
    const problem = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${target.path}: ${problem}`, { cause });
  }
}

async function writeFileWithDirectory(fileWrite: FileWrite): Promise<void> {
  await mkdir(dirname(fileWrite.path), { recursive: true });
  await writeFile(fileWrite.path, fileWrite.contents);
}

export async function updateIconTargets(
  targets: IconTarget[],
  overlays: Overlay[]
): Promise<void> {
  // Render every image before writing so a rendering failure leaves all icons untouched.
  // A failed write can still leave some icons stamped, and the next prebuild regenerates them.
  const fileWrites = await Promise.all(
    targets.map(async (target) =>
      target.kind === "png"
        ? [await createPngWrite(target, overlays)]
        : createIconFolderWrites(target, overlays)
    )
  );
  await Promise.all(fileWrites.flat().map(writeFileWithDirectory));
}
