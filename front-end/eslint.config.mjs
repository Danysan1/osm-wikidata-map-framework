import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/next.config.mjs",
    "**/node_modules/",
    "**/.next/",
    "src/generated/",
    "src/load-related/load-related.js",
    "src/services/WikidataBulkService/WikidataBulkService.js",
]), {
    extends: [
        ...nextCoreWebVitals,
        ...compat.extends("eslint:recommended"),
        ...compat.extends("plugin:@typescript-eslint/recommended-type-checked"),
        ...compat.extends("plugin:@typescript-eslint/stylistic-type-checked")
    ],

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, "off"])),
        },

        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            project: true,
        },
    },

    rules: {
        "no-constant-binary-expression": "error",
    },
}]);