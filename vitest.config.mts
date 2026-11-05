// Runs package behavior tests in Node rather than a mobile runtime.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
