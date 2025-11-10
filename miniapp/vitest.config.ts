import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    restoreMocks: true,
    css: false
  },
  resolve: {
    alias: {
      "lodash/isEqualWith": "lodash/isEqualWith.js"
    }
  }
});
