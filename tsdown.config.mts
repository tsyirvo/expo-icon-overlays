// Builds the Node-only plugin and its public type declarations.
import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["cjs"],
  outDir: "build",
  outExtensions: () => ({ dts: ".d.ts", js: ".js" }),
  platform: "node",
  target: "node24",
});
