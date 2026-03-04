import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",      // stop eslint scanning coverage output
  ]),
  // Ignore tests
  {
    files: ["__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Relax rules in source files
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",      // any is not ideal but not a big deal
      "react-hooks/exhaustive-deps": "warn",            // hooks warnings, not errors
    },
  },
]);

export default eslintConfig;