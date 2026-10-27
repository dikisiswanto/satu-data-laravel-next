import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    "**/node_modules/**",
    "**/vendor/**",
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "backend/storage/**",
    "backend/bootstrap/cache/**",
    "backend/public/build/**",
    "backend/openapi/**",
    "**/*.min.js",
  ]),
  {
    files: ["**/*.js", "**/*.jsx"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
