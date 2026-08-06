/**
 * ESLint flat config.
 *
 * The repo previously had no ESLint configuration at all: `npm run lint` ran
 * the deprecated `next lint`, which found no config, dropped into an
 * interactive setup prompt and exited 1. CI never invoked it, so nothing was
 * ever linted.
 *
 * eslint-config-next 15.x ships eslintrc-format configs only, so FlatCompat
 * bridges them into ESLint 9's flat config.
 */
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // iCloud sync conflict copies; not real source files.
      "**/* 2.*",
      "**/node_modules 2/**",
      "next-env.d.ts",
      // Config files — export-default is the tooling convention
      // (Drizzle, PostCSS, ESLint all expect inline exports).
      "postcss.config.mjs",
      "drizzle.config.ts",
      "eslint.config.mjs",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      /**
       * Underscore-prefixed variables and parameters are intentionally unused
       * (callback signatures, destructuring, future-state fields). Suppress
       * the warning — the prefix IS the signal.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      /**
       * Warn, not error.
       *
       * The plain `<a href="/sign-in">` elements this flags are deliberate, not
       * oversights. CLAUDE.md §"Production Build Constraints" requires signed-out
       * UI to be gated with a plain link rather than Clerk client components,
       * and cites app/reviewer-seat/accept/page.tsx as the reference;
       * components/logout-button.tsx says the same in its docstring. Rewriting
       * them to next/link would swap a hard navigation for client-side routing
       * in the hosted-Clerk handoff, which is load-bearing for session pickup.
       *
       * Kept visible as a warning so genuinely accidental `<a>` links still get
       * caught in review rather than the rule being switched off outright.
       */
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];
