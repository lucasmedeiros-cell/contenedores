import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Las otras carpetas de compilación de NEXT_DIST_DIR (ver next.config.ts):
    // sin esto, `npm run dev:ambos` deja miles de errores del código generado.
    ".next-verify/**",
    ".next-alquileres/**",
    ".next-cerveceria/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
