// Connects option validation to native mods without changing the app's icon configuration.
import type { ConfigPlugin } from "expo/config-plugins";
import { registerIconOverlayMods } from "./native/index";
import { parseOptions } from "./options/index";

export type { IconOverlay, IconOverlayOptions } from "./types";

const withIconOverlays: ConfigPlugin<unknown> = (config, raw) => {
  const options = parseOptions(raw);
  if (!options.enabled || options.overlays.length === 0) {
    return config;
  }
  return registerIconOverlayMods(config, options);
};

export default withIconOverlays;
