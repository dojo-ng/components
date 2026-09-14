import { playwrightLauncher } from "@web/test-runner-playwright";
import { emulateMediaPlugin } from "@web/test-runner-commands/plugins";

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

// DJ_REAL_VIDEO adds tests/browser/video-real.test.js, which audits dj-video against the REAL
// video.js engine instead of the stub player video.test.js installs. It is OFF by default and
// deliberately off the per-commit path: it loads the actual engine, which is heavy and is the
// reason the stub seam exists in the first place. It is not a substitute for video.test.js —
// that suite tests our integration, this one audits the control bar video.js draws, which the
// stub necessarily excludes and which is where dj-video's accessibility actually lives.
//
// The stylesheet is video.js's documented APP PREREQUISITE (packages/video/README.md), loaded at
// document level rather than bundled. It has to be in the page for the audit to mean anything:
// axe reports contrast off computed styles, so an unstyled control bar produces findings about a
// player no user will ever see. It is served from node_modules rather than the CDN in the README
// so the run needs no network and audits exactly the version installed here.
//
// Invoke as `npm run test:video:real`, or `env DJ_REAL_VIDEO=1 npm run test:browser` for the whole
// suite — `env` because tcsh has no inline `VAR=val cmd` form.
const realVideo = Boolean(process.env.DJ_REAL_VIDEO);
const VIDEO_JS_CSS = "/node_modules/video.js/dist/video-js.css";

// WHY THE BARE `video.js` SPECIFIER IS REDIRECTED, and why this is not a way of dodging the
// engine. Left alone, `import("video.js")` inside dj-video resolves by the package's `module`
// field to dist/video.es.js — an ESM build that deliberately leaves its dependencies EXTERNAL.
// Six of those ship CommonJS only: global/window, global/document, @videojs/xhr, videojs-vtt.js,
// mux.js/lib/* and @babel/runtime/helpers/extends. `nodeResolve` rewrites bare specifiers to
// paths; it does not convert CJS to ESM. So the browser parses `module.exports = win` as a module
// that exports nothing and dies on video.es.js's own first line of imports:
//
//   The requested module './../../../global/window.js' does not provide an export named 'default'
//
// That is a SyntaxError at load, before any player object exists, which is why the run was 0/4 on
// all three engines with `mountRealPlayer`'s `assert(el.player(), ...)` failing first and no audit
// ever running. Identical everywhere because it is spec behavior, not an engine quirk.
//
// The fix serves video.js's UMD bundle instead, which is the SAME 8.23.9 source with its
// dependencies already inlined — a change of bundle format, not of engine. The control bar this
// audits is byte-for-byte the one the es build draws. The UMD preamble finds no `exports` and no
// AMD `define` in a module context and assigns `globalThis.videojs`, so a two-line ESM shim hands
// `createPlayer` the same default export it expected. dj-video is untouched and its real
// `import("video.js")` path still runs.
//
// The alternative is @rollup/plugin-commonjs through `fromRollup`, which converts the six on the
// fly. It is a new dependency, it needs nodeResolve switched to `browser: true` so `global`'s
// browser field keeps the min-document DOM shim out, and it pays the conversion cost on every
// serve. Redirecting to a bundle video.js already ships is smaller and has nothing to go stale.
//
// Minified rather than the 2.4MB unminified UMD: axe reads computed styles and class names, both
// of which minification leaves alone, and this file is parsed fresh by three engines per run.
const VIDEO_JS_UMD = "/node_modules/video.js/dist/video.min.js";
const VIDEO_JS_SHIM = "/__video-js-umd.js";

// User plugins resolve imports before nodeResolve does (test-runner puts nodeResolve last on
// purpose), so this wins the bare specifier without nodeResolve needing to know about it.
const videoJsUmdPlugin = {
	name: "video-js-umd",
	resolveImport({ source }) {
		return source === "video.js" ? VIDEO_JS_SHIM : undefined;
	},
	serve(context) {
		if (context.path === VIDEO_JS_SHIM) {
			return {
				body: `import "${VIDEO_JS_UMD}";\nexport default globalThis.videojs;\n`,
				type: "js",
			};
		}
		return undefined;
	},
};

export default {
	files: [
		"tests/browser/**/*.test.js",
		"!tests/browser/bench.test.js",
		...(realVideo ? [] : ["!tests/browser/video-real.test.js"]),
	],
	nodeResolve: true,
	// emulateMediaPlugin (@web/test-runner-commands) is always on: it just registers the
	// `emulate-media` server command a browser test calls via `emulateMedia({...})` — a no-op for
	// any test that doesn't call it. videoJsUmdPlugin stays gated on the flag: the default suite
	// resolves `video.js` exactly as it always has.
	plugins: [emulateMediaPlugin(), ...(realVideo ? [videoJsUmdPlugin] : [])],
	browsers: browsers.map((product) => playwrightLauncher({ product })),
	testFramework: {
		config: { ui: "bdd", timeout: 5000 },
	},
	// Only when the real-engine audit is in the run: everything else is unaffected, so the default
	// suite renders in exactly the same environment it always has.
	...(realVideo
		? {
				testRunnerHtml: (testFramework) =>
					`<html><head><link rel="stylesheet" href="${VIDEO_JS_CSS}"></head>` +
					`<body><script type="module" src="${testFramework}"></script></body></html>`,
			}
		: {}),
	coverage,
	coverageConfig: {
		include: ["packages/*/dist/**/*.js"],
		exclude: ["**/node_modules/**", "**/*.styles.js"],
		reporters: ["lcovonly"],
		reportDir: "coverage/browser",
	},
};
