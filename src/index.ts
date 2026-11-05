// Connects the plugin entry to its modules without changing the Expo config yet.
import type { ConfigPlugin } from "expo/config-plugins";

export type { IconOverlay, IconOverlayOptions } from "./types";

const withIconOverlays: ConfigPlugin = (config) => config;

export default withIconOverlays;
