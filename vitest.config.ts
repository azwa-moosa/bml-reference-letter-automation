import path from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/support/server-only.ts") } },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node", pool: "forks", testTimeout: 30000, hookTimeout: 60000, env: { APP_TODAY: "2026-10-27", REF_YEAR: "2026" } },
});
