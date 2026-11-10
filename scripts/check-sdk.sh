#!/bin/sh
# Check a selected consumer SDK without changing repository dependencies or widening published support.
set -eu

PACKAGE_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
PACK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/icon-overlays-sdk.XXXXXX")
EXPO_SPEC=${1:?Supply an Expo version, range or dist-tag.}
printf 'SDK check package directory: %s\n' "$PACK_ROOT"

# Resolve the spec once, with the fixture cooldown, so the candidate range and the checked app use the same version.
mkdir "$PACK_ROOT/resolve"
cp "$PACKAGE_ROOT/fixtures/expo-app/package.json" "$PACKAGE_ROOT/fixtures/expo-app/bunfig.toml" "$PACK_ROOT/resolve/"
cd "$PACK_ROOT/resolve"
bun add --ignore-scripts "expo@$EXPO_SPEC"
ICON_OVERLAYS_EXPO=$(node -p "require('expo/package.json').version")
export ICON_OVERLAYS_EXPO
printf 'Expo %s resolved to %s\n' "$EXPO_SPEC" "$ICON_OVERLAYS_EXPO"

PLUGIN_ROOT=$PACKAGE_ROOT
if [ "${ICON_OVERLAYS_CANDIDATE:-0}" = 1 ]; then
  PLUGIN_ROOT="$PACK_ROOT/candidate"
  mkdir "$PLUGIN_ROOT"
  cp -R "$PACKAGE_ROOT/src" "$PACKAGE_ROOT/assets" "$PLUGIN_ROOT/"
  cp "$PACKAGE_ROOT/package.json" "$PACKAGE_ROOT/tsconfig.json" "$PACKAGE_ROOT/tsdown.config.mts" "$PACKAGE_ROOT/app.plugin.js" "$PLUGIN_ROOT/"
  ln -s "$PACKAGE_ROOT/node_modules" "$PLUGIN_ROOT/node_modules"
  export PLUGIN_ROOT
  node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(process.env.PLUGIN_ROOT, 'package.json');
const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
manifest.peerDependencies.expo += ' || ' + process.env.ICON_OVERLAYS_EXPO;
fs.writeFileSync(filename, JSON.stringify(manifest, null, 2) + '\n');
NODE
  printf 'Compatibility probe only. Candidate support range is not a release support claim.\n'
fi
cd "$PLUGIN_ROOT"
bun run build
bun pm pack --destination "$PACK_ROOT"

# The packed-package check installs the resolved Expo and the tarball, so the plugin loads that Expo.
set -- "$PACK_ROOT"/expo-icon-overlays-*.tgz
sh "$PACKAGE_ROOT/scripts/check-package.sh" "$1"
