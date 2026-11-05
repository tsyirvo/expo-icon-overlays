#!/bin/sh
# Check the packed plugin in an isolated app without repository dependencies.
set -eu

PACKAGE_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
CHECK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/icon-overlays-pack.XXXXXX")
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
cp "$PACKAGE_ROOT/fixtures/expo-app/bun.lock" "$CHECK_ROOT/bun.lock"
cp "$PACKAGE_ROOT/fixtures/expo-app/bunfig.toml" "$CHECK_ROOT/bunfig.toml"
cd "$CHECK_ROOT"
bun install --frozen-lockfile
bun add "$CHECK_ROOT"/expo-icon-overlays-*.tgz

export ICON_OVERLAYS_PLUGIN=expo-icon-overlays
node <<'NODE'
const assert = require('node:assert/strict');
const path = require('node:path');
const { realpathSync } = require('node:fs');
const manifest = require('expo-icon-overlays/package.json');
const plugin = require('expo-icon-overlays');
const pluginEntry = require('expo-icon-overlays/app.plugin.js');
assert.equal(typeof plugin, 'function', 'package.json: the packed entry is not callable. Correct the CommonJS build and exports.');
assert.equal(pluginEntry, plugin, 'app.plugin.js: Expo and Node resolve different plugins. Load the public build entry.');
assert.equal(manifest.name, 'expo-icon-overlays', 'package.json: the installed package name is wrong. Pack expo-icon-overlays.');
assert.ok(require.resolve('expo-icon-overlays').startsWith(path.join(realpathSync(process.env.CHECK_ROOT), 'node_modules')), 'package.json: the entry resolves outside the isolated app. Remove links and repack.');
assert.throws(() => require.resolve('expo-icon-overlays/src/index.ts'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }, 'package.json: exports expose internal files. Restrict exports to the public interface.');
NODE
CI=1 bun expo config --type prebuild
CI=1 bun expo prebuild --no-install
printf 'Packed-package checks passed. Inspect retained files at %s\n' "$CHECK_ROOT"
