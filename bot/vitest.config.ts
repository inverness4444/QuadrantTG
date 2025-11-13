import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setupEnv.ts"],
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
