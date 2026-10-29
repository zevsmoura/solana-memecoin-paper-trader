import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const localRequire = createRequire(import.meta.url);
const nextRequire = createRequire(localRequire.resolve("eslint-config-next"));
const { FlatCompat } = nextRequire("@eslint/eslintrc");
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
const config = [...compat.extends("next/core-web-vitals", "next/typescript"), { ignores: [".next/**", ".next-dev/**", ".next-build/**", "node_modules/**", ".pnpm-store/**", "prisma/generated/**", "next-env.d.ts"] }];
export default config;
