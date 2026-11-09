// Adds overlay layers to Expo's copy of an Icon Composer folder and leaves the source folder unchanged.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Overlay, Surface } from "../types";

// Icon Composer draws on a 1024-point canvas, and a PNG layer of the same size fills it.
const LAYER_CANVAS_SIZE_PX = 1024;
const METADATA_FILENAME = "icon.json";
const LAYER_DIRECTORY = "Assets";
const RESERVED_NAME_PREFIX = "expo-icon-overlays";
// actool fails the Xcode build when more groups than this are visible, including the overlay group.
const MAXIMUM_VISIBLE_GROUP_COUNT = 4;
// The first group draws in front. The tinted layer replaces the default layer in tinted
// and clear appearances, so the strip keeps the PNG tinted rule instead of system desaturation.
const OVERLAY_LAYERS: {
  name: string;
  surface: Surface;
  hiddenSpecializations: { appearance?: "tinted"; value: boolean }[];
}[] = [
  {
    hiddenSpecializations: [
      { value: false },
      { appearance: "tinted", value: true },
    ],
    name: RESERVED_NAME_PREFIX,
    surface: "square",
  },
  {
    hiddenSpecializations: [
      { value: true },
      { appearance: "tinted", value: false },
    ],
    name: `${RESERVED_NAME_PREFIX}-tinted`,
    surface: "square-tinted",
  },
];

export interface IconFolderTarget {
  copiedPath: string;
  kind: "icon-folder";
  sourcePath: string;
}

export interface FileWrite {
  contents: Buffer | string;
  path: string;
}

interface IconMetadata extends Record<string, unknown> {
  groups: unknown[];
}

function isMissingFileError(cause: unknown): boolean {
  // ENOTDIR means ios.icon names a file instead of a folder.
  return (
    cause instanceof Error &&
    "code" in cause &&
    (cause.code === "ENOENT" || cause.code === "ENOTDIR")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIconMetadata(value: unknown): value is IconMetadata {
  return isRecord(value) && Array.isArray(value.groups);
}

// Matches actool: "hidden" wins, and otherwise every specialization must hide the item,
// starting with the default one, because an unspecialized appearance shows it.
function isHiddenInEveryAppearance(item: Record<string, unknown>): boolean {
  if (item.hidden === true) {
    return true;
  }
  const specializations = item["hidden-specializations"];
  return (
    Array.isArray(specializations) &&
    specializations.some(
      (specialization) =>
        isRecord(specialization) &&
        !("appearance" in specialization) &&
        specialization.value === true
    ) &&
    specializations.every(
      (specialization) =>
        isRecord(specialization) && specialization.value === true
    )
  );
}

function isVisibleGroup(group: unknown): boolean {
  return (
    isRecord(group) &&
    !isHiddenInEveryAppearance(group) &&
    Array.isArray(group.layers) &&
    group.layers.some(
      (layer) => isRecord(layer) && !isHiddenInEveryAppearance(layer)
    )
  );
}

async function readSourceMetadata(sourcePath: string): Promise<IconMetadata> {
  const path = join(sourcePath, METADATA_FILENAME);
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (cause) {
    if (isMissingFileError(cause)) {
      throw new Error(
        `${path}: expected icon file is missing. Set ios.icon to an existing .icon folder and run prebuild again.`,
        { cause }
      );
    }
    throw cause;
  }
  let metadata: unknown;
  try {
    metadata = JSON.parse(text);
  } catch (cause) {
    throw new Error(
      `${path}: icon metadata is not valid JSON. Save the folder again in Icon Composer and run prebuild again.`,
      { cause }
    );
  }
  if (!isIconMetadata(metadata)) {
    throw new Error(
      `${path}: icon metadata has no groups list. Save the folder again in Icon Composer and run prebuild again.`
    );
  }
  return metadata;
}

async function readSourceLayerFilenames(sourcePath: string): Promise<string[]> {
  try {
    return await readdir(join(sourcePath, LAYER_DIRECTORY));
  } catch (cause) {
    if (isMissingFileError(cause)) {
      return [];
    }
    throw cause;
  }
}

async function checkReservedLayerFilenames(sourcePath: string): Promise<void> {
  const reserved = new Set(OVERLAY_LAYERS.map((layer) => `${layer.name}.png`));
  const clash = (await readSourceLayerFilenames(sourcePath)).find((filename) =>
    reserved.has(filename)
  );
  if (clash) {
    throw new Error(
      `${join(sourcePath, LAYER_DIRECTORY, clash)}: this filename is reserved by expo-icon-overlays. Rename the layer file in Icon Composer and run prebuild again.`
    );
  }
}

function checkVisibleGroupLimit(
  sourcePath: string,
  metadata: IconMetadata
): void {
  if (
    metadata.groups.filter(isVisibleGroup).length >= MAXIMUM_VISIBLE_GROUP_COUNT
  ) {
    throw new Error(
      `${join(sourcePath, METADATA_FILENAME)}: the icon already has ${MAXIMUM_VISIBLE_GROUP_COUNT} visible groups, so the overlay group would exceed Xcode's limit. Merge two groups in Icon Composer and run prebuild again.`
    );
  }
}

function addOverlayGroup(metadata: IconMetadata): IconMetadata {
  const overlayGroup = {
    layers: OVERLAY_LAYERS.map((layer) => ({
      glass: false,
      "hidden-specializations": layer.hiddenSpecializations,
      "image-name": `${layer.name}.png`,
      name: layer.name,
    })),
    shadow: { kind: "none", opacity: 0 },
    translucency: { enabled: false, value: 0 },
  };
  return { ...metadata, groups: [overlayGroup, ...metadata.groups] };
}

async function renderOverlayLayers(
  target: IconFolderTarget,
  overlays: Overlay[]
): Promise<FileWrite[]> {
  const { renderOverlayLayer } = await import("../stamp/index");
  try {
    return await Promise.all(
      OVERLAY_LAYERS.map(async (layer) => ({
        contents: await renderOverlayLayer(
          LAYER_CANVAS_SIZE_PX,
          overlays,
          layer.surface
        ),
        path: join(target.copiedPath, LAYER_DIRECTORY, `${layer.name}.png`),
      }))
    );
  } catch (cause) {
    const problem = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${target.sourcePath}: ${problem}`, { cause });
  }
}

export async function createIconFolderWrites(
  target: IconFolderTarget,
  overlays: Overlay[]
): Promise<FileWrite[]> {
  // Expo skips the copy with only a warning when the source is missing, so reading the source
  // turns that case into an error instead of stamping a copy left by an earlier prebuild.
  const metadata = await readSourceMetadata(target.sourcePath);
  checkVisibleGroupLimit(target.sourcePath, metadata);
  await checkReservedLayerFilenames(target.sourcePath);
  const layers = await renderOverlayLayers(target, overlays);
  return [
    ...layers,
    {
      contents: `${JSON.stringify(addOverlayGroup(metadata), null, 2)}\n`,
      path: join(target.copiedPath, METADATA_FILENAME),
    },
  ];
}
