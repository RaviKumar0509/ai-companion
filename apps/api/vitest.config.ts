
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
    ],
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
  },
});
