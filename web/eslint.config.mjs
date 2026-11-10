import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
      "src/lib/api-types.gen.ts",
    ],
  },
  // Prettier last, so it turns off rules that fight the formatter.
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
];

export default config;
