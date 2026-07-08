// Flat ESLint config (v9) for @dojo-ng/components.
//
// Correctness only: no formatting rules and no Prettier. Tabs and the existing
// house style stay; `tsc -b` already owns type errors, so the type-checked
// typescript-eslint variants are deliberately NOT used (type-aware lint is slow
// and duplicative). See docs/qa-requirements.md for the policy this implements.
//
// Layers: @eslint/js recommended (all linted files) + typescript-eslint
// recommended and the Lit / web-component plugin rules (the TS component source),
// with the test suite treated as its own environment.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import lit from "eslint-plugin-lit";
import wc from "eslint-plugin-wc";

// Intentionally-unused bindings are prefixed with `_` (override/callback params
// that must keep their name for the contract, ignored catch bindings). Honor that
// convention instead of forcing dead-looking edits to signatures.
const unusedVarsOptions = {
	argsIgnorePattern: "^_",
	varsIgnorePattern: "^_",
	caughtErrorsIgnorePattern: "^_",
};

export default tseslint.config(
	{
		// dist = build output, types = generated .d.ts, docs/playground = non-source
		// (docs is generated; playground is demo HTML+JS). The gen* scripts are Python.
		ignores: ["**/dist/", "node_modules/", "types/", "docs/", "playground/"],
	},
	js.configs.recommended,
	{
		// TypeScript component/support source.
		files: ["packages/*/src/**/*.ts"],
		extends: [
			tseslint.configs.recommended,
			lit.configs["flat/recommended"],
			wc.configs["flat/recommended"],
		],
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", unusedVarsOptions],
		},
	},
	{
		// Test suite: plain ESM run under `node --test` with a happy-dom global
		// environment installed at runtime (see tests/setup.js). ESLint can't see
		// those browser globals, so no-undef would false-positive on every DOM name;
		// the tests aren't type-checked here, so it earns nothing. Turn it off.
		files: ["tests/**/*.js"],
		rules: {
			"no-undef": "off",
			"no-unused-vars": ["error", unusedVarsOptions],
		},
	},
);
