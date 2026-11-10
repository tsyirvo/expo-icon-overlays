// Checks final native assets after complete Expo CLI prebuilds with real rendering dependencies.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";

const CHANNELS_PER_PIXEL = 4;
const ALPHA_CHANNEL = 3;
const MAXIMUM_CHANNEL = 255;
const SOURCE_SIZE_PX = 128;
const IOS_SIZE_PX = 1024;
const CHILD_ENV = { ...process.env };
CHILD_ENV.CI = "1";
CHILD_ENV.EXPO_NO_TELEMETRY = "1";
const DENSITIES = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
] as const;
const OVERLAY = { background: "#E02233", text: "DEV", type: "banner" };
const ANY_APPLIED = /Applied .* overlays/u;
const PLUGINS_ERROR = /plugins/u;
const ICON_FOLDER = "ios/IconOverlaysFixture/Main.icon/";
const ICON_FOLDER_METADATA = `${ICON_FOLDER}icon.json`;
const ICON_FOLDER_LAYERS = new Map([
  [`${ICON_FOLDER}Assets/expo-icon-overlays.png`, [224, 34, 51, 255]],
  [`${ICON_FOLDER}Assets/expo-icon-overlays-tinted.png`, [255, 255, 255, 255]],
]);
const ANDROID_COUNTS = {
  adaptive: 15,
  appearances: 10,
  "icon-folder": 10,
  monochrome: 20,
  single: 10,
};
const IOS_ICONS = {
  adaptive: undefined,
  appearances: {
    dark: "./assets/dark.png",
    light: "./assets/icon.png",
    tinted: "./assets/tinted.png",
  },
  "icon-folder": "./assets/Main.icon",
  monochrome: undefined,
  single: undefined,
};
const PLUGIN =
  process.env.ICON_OVERLAYS_PLUGIN ??
  resolve(import.meta.dirname, "../app.plugin.js");
const DEPENDENCY_ROOT = resolve(
  process.env.ICON_OVERLAYS_FIXTURE_ROOT ??
    join(import.meta.dirname, "../fixtures/expo-app")
);
const FIRST_SDK_WITH_DEFAULT_CLEAN = 57;
const { version: EXPO_VERSION }: { version: string } = JSON.parse(
  await readFile(
    join(DEPENDENCY_ROOT, "node_modules/expo/package.json"),
    "utf8"
  )
);
// SDK 57 made prebuild clean by default and added --no-clean. SDK 56 keeps native folders without a flag.
const KEEP_NATIVE_FOLDERS_ARGS =
  Number.parseInt(EXPO_VERSION, 10) >= FIRST_SDK_WITH_DEFAULT_CLEAN
    ? ["--no-clean"]
    : [];
const SUITE_ROOT = await mkdtemp(join(tmpdir(), "icon-overlays-fixtures-"));
console.log(`Fixture directory: ${SUITE_ROOT} (Expo ${EXPO_VERSION})`);

type Setup =
  | "single"
  | "appearances"
  | "adaptive"
  | "monochrome"
  | "icon-folder";
type Mode = "absent" | "active" | "disabled" | "empty" | "duplicate";
type Files = Map<string, Buffer>;

function createSourceIcon(color: readonly number[]): Buffer {
  const image = new PNG({ height: SOURCE_SIZE_PX, width: SOURCE_SIZE_PX });
  for (
    let offset = 0;
    offset < image.data.length;
    offset += CHANNELS_PER_PIXEL
  ) {
    image.data.set(color, offset);
  }
  return PNG.sync.write(image);
}

async function createApp(setup: Setup): Promise<string> {
  const root = await mkdtemp(join(SUITE_ROOT, `${setup}-`));
  await copyFile(
    join(DEPENDENCY_ROOT, "package.json"),
    join(root, "package.json")
  );
  await symlink(
    join(DEPENDENCY_ROOT, "node_modules"),
    join(root, "node_modules"),
    "dir"
  );
  await mkdir(join(root, "assets/Main.icon/Assets"), { recursive: true });
  await Promise.all([
    writeFile(
      join(root, "assets/icon.png"),
      createSourceIcon([24, 100, 160, MAXIMUM_CHANNEL])
    ),
    writeFile(
      join(root, "assets/dark.png"),
      createSourceIcon([20, 40, 60, MAXIMUM_CHANNEL])
    ),
    writeFile(
      join(root, "assets/tinted.png"),
      createSourceIcon([90, 90, 90, MAXIMUM_CHANNEL])
    ),
    writeFile(
      join(root, "assets/foreground.png"),
      createSourceIcon([20, 140, 70, MAXIMUM_CHANNEL])
    ),
    writeFile(
      join(root, "assets/background.png"),
      createSourceIcon([230, 210, 100, MAXIMUM_CHANNEL])
    ),
    writeFile(
      join(root, "assets/favicon.png"),
      createSourceIcon([180, 60, 150, MAXIMUM_CHANNEL])
    ),
    writeFile(
      join(root, "assets/Main.icon/Assets/layer.png"),
      createSourceIcon([50, 70, 90, MAXIMUM_CHANNEL])
    ),
    writeFile(
      join(root, "assets/Main.icon/icon.json"),
      JSON.stringify({
        groups: [{ layers: [{ "image-name": "layer.png", name: "Layer" }] }],
      })
    ),
    writeFile(
      join(root, ".gitignore"),
      "node_modules/\nios/\nandroid/\n.expo/\n"
    ),
  ]);
  return root;
}

async function writeConfig(
  root: string,
  setup: Setup,
  mode: Mode,
  text = "DEV",
  context: { additionalPlugins?: string[]; version?: string } = {}
): Promise<void> {
  const options = {
    enabled: mode !== "disabled",
    overlays: mode === "empty" ? [] : [{ ...OVERLAY, text }],
  };
  const entry = [PLUGIN, options];
  const entries = mode === "duplicate" ? [entry, entry] : [entry];
  const plugins = [
    ...(mode === "absent" ? [] : entries),
    ...(context.additionalPlugins ?? []),
  ];
  const hasAdaptive = setup === "adaptive" || setup === "monochrome";
  await writeFile(
    join(root, "app.json"),
    JSON.stringify({
      expo: {
        android: {
          package: "dev.tsyirvo.iconoverlays.fixture",
          ...(hasAdaptive
            ? {
                adaptiveIcon: {
                  backgroundImage: "./assets/background.png",
                  foregroundImage: "./assets/foreground.png",
                  ...(setup === "monochrome"
                    ? { monochromeImage: "./assets/foreground.png" }
                    : {}),
                },
              }
            : {}),
        },
        icon: "./assets/icon.png",
        ios: {
          bundleIdentifier: "dev.tsyirvo.iconoverlays.fixture",
          icon: IOS_ICONS[setup],
        },
        name: "IconOverlaysFixture",
        plugins,
        runtimeVersion: { policy: "appVersion" },
        slug: "icon-overlays-fixture",
        version: context.version ?? "1.0.0",
        web: { favicon: "./assets/favicon.png" },
      },
    })
  );
}

function runPrebuild(root: string): { status: number | null; output: string } {
  const result = spawnSync(
    "bun",
    ["expo", "prebuild", "--no-install", ...KEEP_NATIVE_FOLDERS_ARGS],
    {
      cwd: root,
      encoding: "utf8",
      env: CHILD_ENV,
    }
  );
  if (result.error) {
    throw result.error;
  }
  return { output: result.stdout + result.stderr, status: result.status };
}

function prebuild(root: string): string {
  const result = runPrebuild(root);
  assert.equal(result.status, 0, result.output);
  return result.output;
}

async function readFiles(root: string, directory: string): Promise<Files> {
  const entries = await readdir(join(root, directory), {
    recursive: true,
    withFileTypes: true,
  });
  return new Map(
    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry): Promise<[string, Buffer]> => {
          const path = join(entry.parentPath, entry.name);
          return [path.slice(root.length + 1), await readFile(path)];
        })
    )
  );
}

async function readNativeAssets(root: string): Promise<Files> {
  const files = await readFiles(root, "android/app/src/main/res");
  for (const [path, bytes] of await readFiles(
    root,
    "ios/IconOverlaysFixture"
  )) {
    if (path.includes("Images.xcassets/") || path.includes("Main.icon/")) {
      files.set(path, bytes);
    }
  }
  return files;
}

function findExpectedTargets(setup: Setup): Map<string, number> {
  const targets = new Map<string, number>();
  const ios = "ios/IconOverlaysFixture/Images.xcassets/AppIcon.appiconset/";
  if (setup !== "icon-folder") {
    targets.set(`${ios}App-Icon-1024x1024@1x.png`, IOS_SIZE_PX);
    if (setup === "appearances") {
      targets.set(`${ios}App-Icon-dark-1024x1024@1x.png`, IOS_SIZE_PX);
      targets.set(`${ios}App-Icon-tinted-1024x1024@1x.png`, IOS_SIZE_PX);
    }
  }
  for (const [density, legacySize, adaptiveSize] of DENSITIES) {
    const android = `android/app/src/main/res/mipmap-${density}/`;
    targets.set(`${android}ic_launcher.webp`, legacySize);
    targets.set(`${android}ic_launcher_foreground.webp`, adaptiveSize);
    if (setup === "adaptive" || setup === "monochrome") {
      targets.set(`${android}ic_launcher_round.webp`, legacySize);
    }
    if (setup === "monochrome") {
      targets.set(`${android}ic_launcher_monochrome.webp`, adaptiveSize);
    }
  }
  return targets;
}

function countPixels(image: PNG, color: readonly number[]): number {
  let count = 0;
  for (
    let offset = 0;
    offset < image.data.length;
    offset += CHANNELS_PER_PIXEL
  ) {
    if (
      color.every((value, channel) => image.data[offset + channel] === value)
    ) {
      count += 1;
    }
  }
  return count;
}

function countTransparentPixels(image: PNG): number {
  return image.data.filter(
    (value, index) =>
      index % CHANNELS_PER_PIXEL === ALPHA_CHANNEL && value === 0
  ).length;
}

function checkOverlayPixels(
  path: string,
  baseline: Buffer,
  stamped: Buffer,
  size: number
): void {
  const before = PNG.sync.read(baseline);
  const after = PNG.sync.read(stamped);
  assert.deepEqual([after.width, after.height], [size, size], path);
  assert.notDeepEqual(
    after.data,
    before.data,
    `${path}: overlay pixels are absent`
  );
  const hasFixedColors = path.includes("tinted") || path.includes("monochrome");
  const strip = hasFixedColors ? [255, 255, 255, 255] : [224, 34, 51, 255];
  assert.ok(
    countPixels(after, strip) > countPixels(before, strip),
    `${path}: the strip color is absent`
  );
  if (path.includes("App-Icon") && !path.includes("dark")) {
    assert.equal(after.alpha, false, `${path}: iOS icon has an alpha channel`);
  }
  if (path.includes("monochrome")) {
    assert.ok(
      countTransparentPixels(after) > countTransparentPixels(before),
      `${path}: monochrome text has no cutout`
    );
  }
  if (path.includes("round")) {
    for (
      let offset = ALPHA_CHANNEL;
      offset < before.data.length;
      offset += CHANNELS_PER_PIXEL
    ) {
      assert.equal(
        after.data[offset],
        before.data[offset],
        `${path}: round alpha changed`
      );
    }
  }
}

function readIconMetadata(
  bytes: Buffer | undefined,
  path: string
): {
  groups: { layers: { "image-name": string }[] }[];
} {
  assert.ok(bytes, `${path}: icon metadata is missing`);
  return JSON.parse(bytes.toString("utf8"));
}

function checkIconFolder(baseline: Files, stamped: Files): void {
  const source = readIconMetadata(
    baseline.get(ICON_FOLDER_METADATA),
    ICON_FOLDER_METADATA
  );
  const output = readIconMetadata(
    stamped.get(ICON_FOLDER_METADATA),
    ICON_FOLDER_METADATA
  );
  assert.deepEqual(
    { ...output, groups: output.groups.slice(1) },
    source,
    `${ICON_FOLDER_METADATA}: the app's own metadata changed`
  );
  const imageNames = output.groups[0]?.layers.map(
    (layer) => `${ICON_FOLDER}Assets/${layer["image-name"]}`
  );
  assert.deepEqual(
    imageNames?.sort(),
    [...ICON_FOLDER_LAYERS.keys()].sort(),
    `${ICON_FOLDER_METADATA}: the front group does not reference the overlay layers`
  );
  for (const [path, strip] of ICON_FOLDER_LAYERS) {
    const bytes = stamped.get(path);
    assert.ok(bytes, `${path}: overlay layer is missing`);
    const layer = PNG.sync.read(bytes);
    assert.deepEqual(
      [layer.width, layer.height],
      [IOS_SIZE_PX, IOS_SIZE_PX],
      path
    );
    assert.ok(
      countTransparentPixels(layer) > 0,
      `${path}: overlay layer hides the icon`
    );
    assert.ok(
      countPixels(layer, strip) > 0,
      `${path}: the strip color is absent`
    );
  }
}

function checkFinalAssets(setup: Setup, baseline: Files, stamped: Files): void {
  const addedPaths =
    setup === "icon-folder" ? [...ICON_FOLDER_LAYERS.keys()] : [];
  assert.deepEqual(
    [...stamped.keys()].sort(),
    [...baseline.keys(), ...addedPaths].sort(),
    "prebuild changed the asset list"
  );
  if (setup === "icon-folder") {
    checkIconFolder(baseline, stamped);
  }
  const targets = findExpectedTargets(setup);
  for (const [path, original] of baseline) {
    if (setup === "icon-folder" && path === ICON_FOLDER_METADATA) {
      continue;
    }
    const output = stamped.get(path);
    assert.ok(output, `${path}: generated asset is missing`);
    const size = targets.get(path);
    if (size) {
      checkOverlayPixels(path, original, output, size);
    } else {
      assert.deepEqual(output, original, `${path}: untargeted asset changed`);
    }
  }
  for (const path of targets.keys()) {
    assert.ok(stamped.has(path), `${path}: expected target is missing`);
  }
}

function checkAppliedCounts(setup: Setup, output: string): void {
  const androidCount = ANDROID_COUNTS[setup];
  assert.ok(
    output.includes(`(android): Applied 1 overlays to ${androidCount} icons`),
    output
  );
  const iosCount = setup === "appearances" ? 3 : 1;
  assert.ok(
    output.includes(`(ios): Applied 1 overlays to ${iosCount} icons`),
    output
  );
}

async function checkSetup(setup: Setup): Promise<void> {
  const root = await createApp(setup);
  const source = await readFiles(root, "assets");
  await writeConfig(root, setup, "absent");
  prebuild(root);
  const baseline = await readNativeAssets(root);
  for (const mode of ["disabled", "empty"] as const) {
    // biome-ignore lint/performance/noAwaitInLoops: Each mode rebuilds the same native project.
    await writeConfig(root, setup, mode);
    const output = prebuild(root);
    assert.deepEqual(
      await readNativeAssets(root),
      baseline,
      `${setup}: ${mode} changed assets`
    );
    assert.doesNotMatch(output, ANY_APPLIED);
  }
  await writeConfig(root, setup, "active");
  checkAppliedCounts(setup, prebuild(root));
  const stamped = await readNativeAssets(root);
  checkFinalAssets(setup, baseline, stamped);
  prebuild(root);
  assert.deepEqual(
    await readNativeAssets(root),
    stamped,
    `${setup}: repeated prebuild accumulated overlays`
  );
  await writeConfig(root, setup, "active", "QA");
  prebuild(root);
  const changed = await readNativeAssets(root);
  assert.notDeepEqual(changed, stamped, `${setup}: text did not change`);
  // A fresh QA build must match the existing project's QA build, not retain DEV pixels.
  const fresh = await createApp(setup);
  await writeConfig(fresh, setup, "active", "QA");
  prebuild(fresh);
  assert.deepEqual(
    changed,
    await readNativeAssets(fresh),
    `${setup}: old overlay pixels remain`
  );
  await writeConfig(root, setup, "disabled");
  prebuild(root);
  const restored = await readNativeAssets(root);
  if (setup === "icon-folder") {
    // A disabled plugin changes no file, so Expo's copy keeps the unreferenced layers until prebuild --clean.
    for (const path of ICON_FOLDER_LAYERS.keys()) {
      assert.ok(
        restored.delete(path),
        `${path}: expected leftover layer is missing`
      );
    }
  }
  assert.deepEqual(
    restored,
    baseline,
    `${setup}: disabling did not restore baseline`
  );
  assert.deepEqual(
    await readFiles(root, "assets"),
    source,
    `${setup}: source assets changed`
  );
  if (setup === "icon-folder") {
    const copied = await readFiles(root, "ios/IconOverlaysFixture/Main.icon");
    for (const [path, bytes] of copied) {
      if (ICON_FOLDER_LAYERS.has(path)) {
        continue;
      }
      assert.deepEqual(
        bytes,
        source.get(path.replace("ios/IconOverlaysFixture/", "assets/")),
        path
      );
    }
  }
  console.log(
    `PASS ${setup}: final pixels, dimensions, untouched assets, no-op modes, repeated/changed/disabled prebuilds`
  );
}

async function checkDuplicateEntries(): Promise<void> {
  const root = await createApp("single");
  await writeConfig(root, "single", "absent");
  prebuild(root);
  const baseline = await readNativeAssets(root);
  await writeConfig(root, "single", "duplicate");
  const duplicate = runPrebuild(root);
  assert.notEqual(
    duplicate.status,
    0,
    "plugins: duplicate active entries succeeded"
  );
  assert.match(duplicate.output, PLUGINS_ERROR);
  assert.deepEqual(
    await readNativeAssets(root),
    baseline,
    "plugins: duplicate entries wrote native files"
  );
  const fresh = await createApp("single");
  await writeConfig(fresh, "single", "duplicate");
  const freshResult = runPrebuild(fresh);
  assert.notEqual(freshResult.status, 0, freshResult.output);
  assert.match(freshResult.output, PLUGINS_ERROR);
  const entries = await readdir(fresh);
  assert.ok(
    !(entries.includes("ios") || entries.includes("android")),
    "plugins: duplicate entries created native folders"
  );
  console.log(
    "PASS duplicate entries: config loading fails before native writes in fresh and existing projects"
  );
}

async function checkBuildErrors(): Promise<void> {
  const root = await createApp("single");
  for (const [platform, filename] of [
    ["ios", "App-Icon-1024x1024@1x.png"],
    ["android", "ic_launcher.webp"],
  ] as const) {
    for (const fault of ["missing", "webp"] as const) {
      const path =
        platform === "ios"
          ? `ios/IconOverlaysFixture/Images.xcassets/AppIcon.appiconset/${filename}`
          : `android/app/src/main/res/mipmap-mdpi/${filename}`;
      const plugin = join(root, "break-icon.js");
      // biome-ignore lint/performance/noAwaitInLoops: Inject one fault at a time into the same native project.
      await writeFile(
        plugin,
        `const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = config => withDangerousMod(config, [${JSON.stringify(platform)}, async config => {
  const target = path.join(config.modRequest.projectRoot, ${JSON.stringify(path)});
  ${fault === "missing" ? "await fs.unlink(target);" : "await fs.writeFile(target, Buffer.from('RIFF0000WEBP'));"}
  return config;
}]);`
      );
      await writeConfig(root, "single", "active", "DEV", {
        additionalPlugins: [plugin],
      });
      const result = runPrebuild(root);
      assert.notEqual(result.status, 0, `${path}: invalid target succeeded`);
      assert.ok(result.output.includes(filename), result.output);
      assert.ok(
        result.output.includes(
          fault === "missing"
            ? "expected icon file is missing"
            : "icon is not PNG data"
        ),
        result.output
      );
    }
  }
  console.log(
    "PASS missing and non-PNG icons: both platforms fail with the target path and corrective action"
  );
}

async function checkIconFolderErrors(): Promise<void> {
  const reserved = await createApp("icon-folder");
  const reservedLayer = "assets/Main.icon/Assets/expo-icon-overlays.png";
  await copyFile(
    join(reserved, "assets/Main.icon/Assets/layer.png"),
    join(reserved, reservedLayer)
  );
  await writeConfig(reserved, "icon-folder", "active");
  const reservedResult = runPrebuild(reserved);
  assert.notEqual(
    reservedResult.status,
    0,
    `${reservedLayer}: clash succeeded`
  );
  assert.ok(
    reservedResult.output.includes(reservedLayer),
    reservedResult.output
  );
  assert.deepEqual(
    await readFile(join(reserved, ICON_FOLDER_METADATA)),
    await readFile(join(reserved, "assets/Main.icon/icon.json")),
    `${ICON_FOLDER_METADATA}: a failed update changed the copied metadata`
  );
  const crowded = await createApp("icon-folder");
  const crowdedMetadata = "assets/Main.icon/icon.json";
  await writeFile(
    join(crowded, crowdedMetadata),
    JSON.stringify({
      groups: Array.from({ length: 4 }, () => ({
        layers: [{ "image-name": "layer.png", name: "Layer" }],
      })),
    })
  );
  await writeConfig(crowded, "icon-folder", "active");
  const crowdedResult = runPrebuild(crowded);
  assert.notEqual(
    crowdedResult.status,
    0,
    `${crowdedMetadata}: a fifth visible group succeeded`
  );
  assert.ok(
    crowdedResult.output.includes(crowdedMetadata),
    crowdedResult.output
  );
  const missing = await createApp("icon-folder");
  await rm(join(missing, "assets/Main.icon"), { recursive: true });
  await writeConfig(missing, "icon-folder", "active");
  const missingResult = runPrebuild(missing);
  assert.notEqual(
    missingResult.status,
    0,
    "Main.icon: missing source succeeded"
  );
  assert.ok(
    missingResult.output.includes("Main.icon/icon.json") &&
      missingResult.output.includes("expected icon file is missing"),
    missingResult.output
  );
  console.log(
    "PASS .icon errors: reserved layer names, full group limits and missing source folders fail before writes and name the file"
  );
}

function createFingerprint(root: string): string {
  const result = spawnSync(
    "node",
    [
      "-e",
      // SDK 58 skips config versions by default. SDK 56 and 57 hash them unless fingerprint.config.js skips them.
      `const { createFingerprintAsync, DEFAULT_SOURCE_SKIPS, SourceSkips } = require('@expo/fingerprint');
createFingerprintAsync(process.cwd(), { sourceSkips: DEFAULT_SOURCE_SKIPS | SourceSkips.ExpoConfigVersions }).then(result => console.log('FINGERPRINT=' + result.hash))`,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: CHILD_ENV,
    }
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const hash = result.stdout.split("FINGERPRINT=")[1]?.trim();
  assert.ok(hash, result.stdout + result.stderr);
  return hash;
}

async function checkVersionToken(): Promise<void> {
  const root = await createApp("single");
  const plugin = join(root, "set-version.js");
  await writeFile(
    plugin,
    `const { withDangerousMod } = require('expo/config-plugins');
module.exports = config => withDangerousMod(config, ['ios', async config => { config.version = '2.0.0'; return config; }]);`
  );
  await writeConfig(root, "single", "active", "{version}", {
    additionalPlugins: [plugin],
  });
  prebuild(root);
  const resolved = await readNativeAssets(root);
  await writeConfig(root, "single", "active", "2.0.0");
  prebuild(root);
  const literal = await readNativeAssets(root);
  for (const [path, bytes] of resolved) {
    if (path.startsWith("ios/")) {
      assert.deepEqual(
        bytes,
        literal.get(path),
        `${path}: version was not resolved in the mod`
      );
    }
  }
  await writeConfig(root, "single", "active", "{version}");
  const tokenBefore = createFingerprint(root);
  await writeConfig(root, "single", "active", "{version}", {
    version: "2.0.0",
  });
  assert.equal(
    createFingerprint(root),
    tokenBefore,
    "{version}: a version-only change altered the fingerprint"
  );
  await writeConfig(root, "single", "active", "1.0.0");
  const literalBefore = createFingerprint(root);
  await writeConfig(root, "single", "active", "2.0.0", { version: "2.0.0" });
  assert.notEqual(
    createFingerprint(root),
    literalBefore,
    "literal version: changed text did not alter the fingerprint"
  );
  console.log(
    "PASS version token: resolves in the mod, preserves a version-skipping appVersion fingerprint, literal text changes it"
  );
}

const selectedChecks = new Set(process.argv.slice(2));
const supportedChecks = new Set([
  "single",
  "appearances",
  "adaptive",
  "monochrome",
  "icon-folder",
  "duplicates",
  "errors",
  "version",
]);
for (const name of selectedChecks) {
  assert.ok(
    supportedChecks.has(name),
    `${name}: unknown fixture check. Select ${[...supportedChecks].join(", ")}.`
  );
}
for (const setup of [
  "single",
  "appearances",
  "adaptive",
  "monochrome",
  "icon-folder",
] as const) {
  if (selectedChecks.size === 0 || selectedChecks.has(setup)) {
    // biome-ignore lint/performance/noAwaitInLoops: Keep full Expo prebuilds serial to bound memory and avoid shared template downloads.
    await checkSetup(setup);
  }
}
if (selectedChecks.size === 0 || selectedChecks.has("duplicates")) {
  await checkDuplicateEntries();
}
if (selectedChecks.size === 0 || selectedChecks.has("errors")) {
  await checkBuildErrors();
  await checkIconFolderErrors();
}
if (selectedChecks.size === 0 || selectedChecks.has("version")) {
  await checkVersionToken();
}
console.log("Final-asset fixture checks passed with unmodified dependencies.");
