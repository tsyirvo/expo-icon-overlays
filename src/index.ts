// Connects the plugin entry to its modules without changing the Expo config yet.
import type { ConfigPlugin } from "expo/config-plugins";

const withIconOverlays: ConfigPlugin = (config) => config;

export default withIconOverlays;
