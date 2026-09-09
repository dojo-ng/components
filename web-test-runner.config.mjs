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
//
// DJ_BROWSERS restricts which engines run, comma-separated (e.g. "chromium"); unset runs
// all three, same as before this existed. CI uses it to give topic pipelines a fast
// Chromium-only run and reserve the full matrix for branch/default.
const browsers = process.env.DJ_BROWSERS
	? process.env.DJ_BROWSERS.split(",").map((b) => b.trim())
	: ["chromium", "firefox", "webkit"];

// DJ_COVERAGE=1 turns on V8 coverage, written as lcov to coverage/browser/. It is off by
// default because instrumentation slows the run and this suite is also the a11y gate. The
// lcov names the built `packages/*/dist/*.js` the tests import, and remaps to the `src/*.ts`
// behind them only when those files were built by `npm run build:coverage`, which is the
// same `tsc -b` with `--sourceMap` added. Without that build step the report is still valid,
// it just points at dist. Coverage is Chromium-only (it is V8's, not the test runner's), so
// `npm run test:browser:coverage` pins DJ_BROWSERS to chromium; the Firefox and WebKit
// engines still run in the normal `npm run test:browser` pass, uninstrumented.
const coverage = Boolean(process.env.DJ_COVERAGE);

export default {
	files: ["tests/browser/**/*.test.js", "!tests/browser/bench.test.js"],
	nodeResolve: true,
	browsers: browsers.map((product) => playwrightLauncher({ product })),
	testFramework: {
		config: { ui: "bdd", timeout: 5000 },
	},
	coverage,
	coverageConfig: {
		include: ["packages/*/dist/**/*.js"],
		exclude: ["**/node_modules/**", "**/*.styles.js"],
		reporters: ["lcovonly"],
		reportDir: "coverage/browser",
	},
};
