import { defineConfig } from "vitest/config";

// Vitest runs the framework-agnostic logic layer (no real browser): i18n, store,
// and the pure list-walk parts of the focus helpers. Default environment is
// Node; the one file that needs DOM structure (focus helpers) opts into happy-dom
// per-file via a `// @vitest-environment happy-dom` docblock. Real focus, layout,
// and cross-browser behavior are the @web/test-runner layer's job, not this one.
export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/unit/**/*.test.js"],
	},
});
