// Checks config-time rejection and no-op behavior through the public plugin.
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExportedConfig } from "expo/config-plugins";
import { describe, expect, it } from "vitest";
import withIconOverlays from "../src/index";

const ACTIVE = { overlays: [{ text: "DEV", type: "banner" }] };
const EXPO_RANGE_ERROR = /expo.*\^58\.0\.0/u;

async function createConsumer(version: string): Promise<ExportedConfig> {
  const root = await mkdtemp(join(tmpdir(), "icon-overlays-consumer-"));
  await mkdir(join(root, "node_modules/expo"), { recursive: true });
  // Synthetic manifests model consumer versions without modifying installed dependencies.
  await writeFile(
    join(root, "node_modules/expo/package.json"),
    JSON.stringify({ name: "expo", version })
  );
  return { _internal: { projectRoot: root }, name: "Fixture", slug: "fixture" };
}

describe("plugin config loading", () => {
  it.each(["57.0.32", "59.0.0", "58.0.0-canary-test", "not-a-version"])(
    "rejects unsupported consumer expo %s with the supported range",
    async (version) => {
      const config = await createConsumer(version);
      expect(() => withIconOverlays(config, ACTIVE)).toThrow(EXPO_RANGE_ERROR);
      expect(config.mods).toBeUndefined();
    }
  );

  it.each([{ enabled: false, ...ACTIVE }, { overlays: [] }])(
    "leaves inactive configurations unchanged even with unsupported Expo",
    async (options) => {
      const config = await createConsumer("57.0.32");
      const original = structuredClone(config);
      expect(withIconOverlays(config, options)).toBe(config);
      expect(config).toEqual(original);
    }
  );

  it("rejects duplicate active entries, including a cloned config, before native writes", async () => {
    const config = await createConsumer("58.0.0");
    const registered = withIconOverlays(config, ACTIVE);
    expect(() => withIconOverlays({ ...registered }, ACTIVE)).toThrow(
      "plugins"
    );
  });

  it("permits inactive entries alongside one active entry", async () => {
    const config = await createConsumer("58.0.23");
    const disabled = withIconOverlays(config, { enabled: false, ...ACTIVE });
    const empty = withIconOverlays(disabled, { overlays: [] });
    const registered = withIconOverlays(empty, ACTIVE);
    expect(() =>
      withIconOverlays(registered, { enabled: false, ...ACTIVE })
    ).not.toThrow();
  });

  it("validates options before taking the disabled fast path", async () => {
    const config = await createConsumer("58.0.0");
    expect(() =>
      withIconOverlays(config, {
        enabled: false,
        overlays: [{ text: "{unknown}", type: "banner" }],
      })
    ).toThrow("text");
  });
});
