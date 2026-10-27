import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.js"],
      exclude: ["src/lib/supabase/**"],
    },
  },
});
