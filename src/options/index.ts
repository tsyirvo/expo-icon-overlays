// Validates overlay options and resolves version tokens without external state.
import type { Overlay, ParsedOptions } from "../types";

const DEFAULT_BACKGROUND = "#111111";
const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/iu;
const SUPPORTED_TEXT = /^[\u0020-\u007e\u00a0-\u00ac\u00ae-\u017f]+$/u;
const VERSION_TOKEN = "{version}";
const BRACES = /[{}]/u;
const OPTION_KEYS = new Set(["enabled", "overlays"]);
const OVERLAY_KEYS = new Set([
  "type",
  "position",
  "text",
  "background",
  "color",
]);

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `${field} must be an object. Supply the documented options.`
    );
  }
  return { ...value };
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  keys: Set<string>,
  field: string
): void {
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) {
      throw new Error(`${field}.${key} is unknown. Remove this option.`);
    }
  }
}

function validateText(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be text. Supply a string.`);
  }
  const text = value.normalize("NFC");
  if (!SUPPORTED_TEXT.test(text) || text.trim().length === 0) {
    throw new Error(
      `${field} needs visible supported Latin text. Remove controls, soft hyphens and unsupported characters.`
    );
  }
  return text;
}

function parseText(value: unknown, field: string): string {
  const text = validateText(value, field);
  if (BRACES.test(text.replaceAll(VERSION_TOKEN, "version"))) {
    throw new Error(
      `${field} has invalid braces or an unknown token. Use only {version}, without nested or literal braces.`
    );
  }
  return text;
}

function parseColor(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new Error(`${field} must be #RGB or #RRGGBB. Supply a hex color.`);
  }
  return value;
}

function parseOverlay(raw: unknown, index: number): Overlay {
  const field = `overlays[${index}]`;
  const value = requireRecord(raw, field);
  rejectUnknownKeys(value, OVERLAY_KEYS, field);
  const style = {
    background:
      parseColor(value.background, `${field}.background`) ?? DEFAULT_BACKGROUND,
    color: parseColor(value.color, `${field}.color`),
    text: parseText(value.text, `${field}.text`),
  };
  if (value.type === "banner") {
    const position = value.position === undefined ? "bottom" : value.position;
    if (position !== "top" && position !== "bottom") {
      throw new Error(
        `${field}.position must be top or bottom. Use a banner position.`
      );
    }
    return { ...style, position, type: "banner" };
  }
  if (value.type === "ribbon") {
    const position =
      value.position === undefined ? "top-right" : value.position;
    if (position !== "top-left" && position !== "top-right") {
      throw new Error(
        `${field}.position must be top-left or top-right. Use a ribbon position.`
      );
    }
    return { ...style, position, type: "ribbon" };
  }
  throw new Error(
    `${field}.type must be banner or ribbon. Select a supported overlay type.`
  );
}

function rejectClashes(overlays: Overlay[]): void {
  const positions = new Set<string>();
  for (const [index, overlay] of overlays.entries()) {
    if (positions.has(overlay.position)) {
      throw new Error(
        `overlays[${index}].position is repeated. Use each position only once.`
      );
    }
    positions.add(overlay.position);
  }
  if (
    positions.has("top") &&
    overlays.some((overlay) => overlay.type === "ribbon")
  ) {
    throw new Error(
      "overlays.position combines a top banner and a ribbon. Remove one of them."
    );
  }
}

export function parseOptions(raw: unknown): ParsedOptions {
  const value = requireRecord(raw, "options");
  rejectUnknownKeys(value, OPTION_KEYS, "options");
  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    throw new Error("enabled must be a boolean. Use true or false.");
  }
  if (!Array.isArray(value.overlays)) {
    throw new Error("overlays must be an array. Supply an array of overlays.");
  }
  const overlays = Array.from(value.overlays, parseOverlay);
  rejectClashes(overlays);
  return { enabled: value.enabled ?? true, overlays };
}

export function resolveTokens(
  overlays: readonly Overlay[],
  context: { version?: string }
): Overlay[] {
  return overlays.map((overlay, index) => {
    if (!overlay.text.includes(VERSION_TOKEN)) {
      return { ...overlay };
    }
    const field = `overlays[${index}].text (config.version)`;
    const version = validateText(context.version, field);
    const text = validateText(
      overlay.text.replaceAll(VERSION_TOKEN, () => version),
      field
    );
    if (BRACES.test(text)) {
      throw new Error(
        `${field} contains braces. Supply a version without tokens or braces.`
      );
    }
    return { ...overlay, text };
  });
}
