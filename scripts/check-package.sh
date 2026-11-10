#!/bin/sh
# Check the packed plugin in an isolated app without repository dependencies.
# Set ICON_OVERLAYS_EXPO to an Expo version, range or dist-tag to check that SDK instead of the locked fixture.
set -eu

PACKAGE_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
CHECK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/icon-overlays-pack.XXXXXX")
EXPO_SPEC=${ICON_OVERLAYS_EXPO:-}
export CHECK_ROOT
printf 'Packed-package check directory: %s\n' "$CHECK_ROOT"

if [ "$#" -eq 0 ]; then
  cd "$PACKAGE_ROOT"
  bun pm pack --destination "$CHECK_ROOT"
else
  cp "$1" "$CHECK_ROOT/$(basename -- "$1")"
fi
cp "$PACKAGE_ROOT/fixtures/expo-app/package.json" "$CHECK_ROOT/package.json"
cp "$PACKAGE_ROOT/fixtures/expo-app/app.config.js" "$CHECK_ROOT/app.config.js"
cp "$PACKAGE_ROOT/fixtures/expo-app/bunfig.toml" "$CHECK_ROOT/bunfig.toml"
cd "$CHECK_ROOT"
if [ -z "$EXPO_SPEC" ]; then
  cp "$PACKAGE_ROOT/fixtures/expo-app/bun.lock" "$CHECK_ROOT/bun.lock"
  bun install --frozen-lockfile
else
  # Omit the lockfile so Bun selects the newest requested version that the fixture cooldown allows.
  bun add "expo@$EXPO_SPEC"
  # Match the React and React Native versions that the selected SDK expects, as a new app on that SDK would.
  REACT_VERSION=$(node -p "require('expo/bundledNativeModules.json').react")
  REACT_NATIVE_VERSION=$(node -p "require('expo/bundledNativeModules.json')['react-native']")
  bun add "react@$REACT_VERSION" "react-native@$REACT_NATIVE_VERSION"
fi
bun add "$CHECK_ROOT"/expo-icon-overlays-*.tgz
printf 'Checking unmodified Expo %s with React Native %s on Node %s\n' \
  "$(node -p "require('expo/package.json').version")" \
  "$(node -p "require('react-native/package.json').version")" \
  "$(node --version)"

export ICON_OVERLAYS_PLUGIN=expo-icon-overlays
node <<'NODE'
const assert = require('node:assert/strict');
const path = require('node:path');
const { realpathSync } = require('node:fs');
const manifest = require('expo-icon-overlays/package.json');
const plugin = require('expo-icon-overlays').default;
const pluginEntry = require('expo-icon-overlays/app.plugin.js');
const pluginExpo = require.resolve('expo/package.json', { paths: [path.dirname(require.resolve('expo-icon-overlays'))] });
assert.equal(pluginExpo, require.resolve('expo/package.json'), 'package.json: the plugin loads a different Expo than the app. Install the plugin into the checked app.');
assert.equal(typeof plugin, 'function', 'package.json: the packed entry is not callable. Correct the CommonJS build and exports.');
assert.equal(pluginEntry, plugin, 'app.plugin.js: Expo and Node resolve different plugins. Load the public build entry.');
plugin({ name: 'Fixture', slug: 'fixture', _internal: { projectRoot: process.env.CHECK_ROOT } }, { overlays: [{ type: 'banner', text: '{version}' }] });
assert.ok(!Object.keys(require.cache).some(filename => filename.includes('@resvg/')), 'app.plugin.js: config loading initialized the rasterizer. Load it only inside the native mod.');
assert.equal(manifest.name, 'expo-icon-overlays', 'package.json: the installed package name is wrong. Pack expo-icon-overlays.');
assert.ok(require.resolve('expo-icon-overlays').startsWith(path.join(realpathSync(process.env.CHECK_ROOT), 'node_modules')), 'package.json: the entry resolves outside the isolated app. Remove links and repack.');
assert.throws(() => require.resolve('expo-icon-overlays/src/index.ts'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, 'package.json: exports expose internal files. Restrict exports to the public interface.');
NODE
CI=1 bun expo config --type prebuild
mkdir "$CHECK_ROOT/scripts"
cp "$PACKAGE_ROOT/scripts/check-fixtures.ts" "$CHECK_ROOT/scripts/check-fixtures.ts"
ICON_OVERLAYS_FIXTURE_ROOT="$CHECK_ROOT" bun "$CHECK_ROOT/scripts/check-fixtures.ts"
printf 'Packed-package checks passed. Inspect retained files at %s\n' "$CHECK_ROOT"
