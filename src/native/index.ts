// Checks plugin registration and consumer compatibility, then wires native icon updates.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { type ExportedConfig, withDangerousMod } from "expo/config-plugins";
import { satisfies } from "semver";
import { peerDependencies } from "../../package.json";
import { resolveTokens } from "../options/index";
import type { ParsedOptions } from "../types";
import { findAndroidIconTargets } from "./android";
import { findIosIconTargets } from "./ios";
import { updateIconTargets } from "./targets";

const REGISTRATION = Symbol.for("expo-icon-overlays.registration");

function checkExpoVersion(config: ExportedConfig): void {
  const projectRoot: unknown = config._internal?.projectRoot;
  const requireConsumer = createRequire(
    resolve(
      typeof projectRoot === "string" ? projectRoot : process.cwd(),
      "package.json"
    )
  );
  const manifest: unknown = requireConsumer("expo/package.json");
  const version =
    typeof manifest === "object" && manifest !== null && "version" in manifest
      ? manifest.version
      : undefined;
  if (
    typeof version !== "string" ||
    !satisfies(version, peerDependencies.expo)
  ) {
    throw new Error(
      `expo version ${String(version)} is unsupported. Install expo in the supported range ${peerDependencies.expo}.`
    );
  }
}

export function registerIconOverlayMods(
  config: ExportedConfig,
  options: ParsedOptions
): ExportedConfig {
  if (
    config.mods &&
    Object.getOwnPropertyDescriptor(config.mods, REGISTRATION)
  ) {
    throw new Error(
      "plugins contains duplicate active expo-icon-overlays entries. Keep only one active entry."
    );
  }
  checkExpoVersion(config);
  let registeredConfig = config;
  for (const platform of ["ios", "android"] as const) {
    registeredConfig = withDangerousMod(registeredConfig, [
      platform,
      async (modConfig) => {
        const targets =
          platform === "ios"
            ? findIosIconTargets(modConfig, modConfig.modRequest.projectRoot)
            : findAndroidIconTargets(
                modConfig,
                modConfig.modRequest.projectRoot
              );
        if (targets.length > 0) {
          const overlays = resolveTokens(options.overlays, {
            version: modConfig.version,
          });
          await updateIconTargets(targets, overlays);
          console.log(
            `expo-icon-overlays (${platform}): Applied ${overlays.length} overlays to ${targets.length} icons`
          );
        }
        return modConfig;
      },
    ]);
  }
  Object.defineProperty(registeredConfig.mods, REGISTRATION, { value: true });
  return registeredConfig;
}
