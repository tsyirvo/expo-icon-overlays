#!/bin/sh
# Check a selected consumer SDK without changing repository dependencies or widening published support.
set -eu

PACKAGE_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
CHECK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/icon-overlays-sdk.XXXXXX")
EXPO_SPEC=${1:?Supply an Expo version, range or dist-tag.}
printf 'SDK check directory: %s\n' "$CHECK_ROOT"
mkdir "$CHECK_ROOT/app"
# Omit the lockfile so Bun selects the newest requested version that the fixture cooldown allows.
cp "$PACKAGE_ROOT/fixtures/expo-app/package.json" "$PACKAGE_ROOT/fixtures/expo-app/bunfig.toml" "$CHECK_ROOT/app/"
cd "$CHECK_ROOT/app"
bun add "expo@$EXPO_SPEC"
EXPO_VERSION=$(node -p "require('./node_modules/expo/package.json').version")
printf 'Checking unmodified Expo %s on Node %s\n' "$EXPO_VERSION" "$(node --version)"

PLUGIN_ROOT=$PACKAGE_ROOT
if [ "${ICON_OVERLAYS_CANDIDATE:-0}" = 1 ]; then
  PLUGIN_ROOT="$CHECK_ROOT/candidate"
  mkdir "$PLUGIN_ROOT"
  cp -R "$PACKAGE_ROOT/src" "$PACKAGE_ROOT/assets" "$PLUGIN_ROOT/"
  cp "$PACKAGE_ROOT/package.json" "$PACKAGE_ROOT/tsconfig.json" "$PACKAGE_ROOT/tsdown.config.mts" "$PACKAGE_ROOT/app.plugin.js" "$PLUGIN_ROOT/"
  ln -s "$PACKAGE_ROOT/node_modules" "$PLUGIN_ROOT/node_modules"
  export PLUGIN_ROOT EXPO_VERSION
  node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(process.env.PLUGIN_ROOT, 'package.json');
const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
manifest.peerDependencies.expo += ' || ' + process.env.EXPO_VERSION;
fs.writeFileSync(filename, JSON.stringify(manifest, null, 2) + '\n');
NODE
  printf 'Compatibility probe only. Candidate support range is not a release support claim.\n'
fi
cd "$PLUGIN_ROOT"
bun run build
bun pm pack --destination "$CHECK_ROOT"

# Install the tarball so the plugin loads the requested Expo instead of the repository's copy.
cd "$CHECK_ROOT/app"
bun add "$CHECK_ROOT"/expo-icon-overlays-*.tgz
export EXPO_VERSION
node <<'NODE'
const assert = require('node:assert/strict');
const path = require('node:path');
const manifest = require.resolve('expo/package.json', { paths: [path.dirname(require.resolve('expo-icon-overlays'))] });
assert.equal(require(manifest).version, process.env.EXPO_VERSION, 'scripts/check-sdk.sh: the plugin loads a different Expo. Install the plugin into the checked app.');
NODE

cd "$PACKAGE_ROOT"
ICON_OVERLAYS_FIXTURE_ROOT="$CHECK_ROOT/app" ICON_OVERLAYS_PLUGIN=expo-icon-overlays bun scripts/check-fixtures.ts
