#!/bin/sh
# Check a selected consumer SDK without changing repository dependencies or widening published support.
set -eu

PACKAGE_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
CHECK_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/icon-overlays-sdk.XXXXXX")
EXPO_SPEC=${1:?Supply an Expo version, range or dist-tag.}
printf 'SDK check directory: %s\n' "$CHECK_ROOT"
mkdir "$CHECK_ROOT/app"
cp "$PACKAGE_ROOT/fixtures/expo-app/package.json" "$PACKAGE_ROOT/fixtures/expo-app/bun.lock" "$PACKAGE_ROOT/fixtures/expo-app/bunfig.toml" "$CHECK_ROOT/app/"
cd "$CHECK_ROOT/app"
bun install --frozen-lockfile
# Resolve the newest match explicitly: Bun can otherwise reuse the older locked version.
EXPO_VERSION=$(bun pm view "expo@$EXPO_SPEC" version)
# The owner approved these exact SDK 58.0.23 exceptions for temporary fixtures only.
cat >> bunfig.toml <<'TOML'
minimumReleaseAgeExcludes = [
  "expo@58.0.23",
  "@expo/cli@58.1.19",
  "@expo/config@58.0.11",
  "@expo/config-plugins@58.0.12",
  "@expo/fingerprint@0.21.9",
  "@expo/env@2.5.4",
  "@expo/inline-modules@0.2.9",
  "@expo/local-build-cache-provider@58.0.11",
  "@expo/log-box@58.0.15",
  "@expo/metro-config@58.0.21",
  "@expo/prebuild-config@58.0.19",
  "@expo/router-server@58.0.21",
  "babel-preset-expo@58.0.24",
  "expo-asset@58.0.20",
  "expo-constants@58.0.15",
  "expo-modules-autolinking@58.0.17",
  "expo-modules-core@58.0.30",
  "expo-modules-jsi@58.0.22",
]
TOML
bun add --exact "expo@$EXPO_VERSION"
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
cd "$PACKAGE_ROOT"
ICON_OVERLAYS_FIXTURE_ROOT="$CHECK_ROOT/app" ICON_OVERLAYS_PLUGIN="$PLUGIN_ROOT/app.plugin.js" bun scripts/check-fixtures.ts
