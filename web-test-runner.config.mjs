import { playwrightLauncher } from "@web/test-runner-playwright";

// Component + accessibility tests, run in real Chromium, Firefox, and WebKit via
// Playwright (the WebKit launcher covers the Safari-15 baseline; risky changes get a
// manual check on an older device — see docs/qa-requirements.md). Test files are plain
// ESM that import each package's built `dist/`; `nodeResolve` lets them import bare
// specifiers (axe-core, the WTR command helpers) too.
//
// The benchmark suite (tests/browser/bench.test.js, Q7) is a RELATIVE-timing gate with
// its own script and is excluded from the default run so timing work never blocks a
// behavior/a11y run.
export default {
	files: ["tests/browser/**/*.test.js", "!tests/browser/bench.test.js"],
	nodeResolve: true,
	browsers: [
		playwrightLauncher({ product: "chromium" }),
		playwrightLauncher({ product: "firefox" }),
		playwrightLauncher({ product: "webkit" }),
	],
	testFramework: {
		config: { ui: "bdd", timeout: 5000 },
	},
};
