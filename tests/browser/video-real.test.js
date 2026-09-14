// dj-video against the REAL video.js engine — the opt-in accessibility audit.
//
// WHY THIS FILE EXISTS, separately from video.test.js. That suite installs a stub player
// through the documented `createPlayer` seam and never loads real video.js, on purpose: real
// media is not CI-stable. The consequence nobody had written down is that `dj-video`'s actual
// accessibility surface is video.js's injected control bar, in light DOM — precisely what the
// stub excludes. So an `assertNoViolations` call over the stubbed component would have turned
// the a11y gate green while auditing nothing at all. This file audits the real thing instead,
// off the per-commit path.
//
// Run it with:  npm run test:video:real          — this file only, and the form to prefer
//           or:  env DJ_REAL_VIDEO=1 npm run test:browser   — whole suite including this file
// It is excluded from the default run by web-test-runner.config.mjs.
//
// `env` is not decoration: Bill's shell is tcsh, where the inline `VAR=val cmd` form is a
// bash-ism and fails. The npm script needs no prefix at all, which is why it is the one to
// reach for.
//
// NO MEDIA IS LOADED, and that is deliberate rather than a shortcut. video.js builds its control
// bar during player init, before any source resolves, so the chrome this audits — control names,
// contrast, focus order — is fully present with no source set. Pointing at a real file would add
// network flake and a `vjs-error` dialog without adding anything to audit. The poster covers the
// before-playback state a viewer actually sees first.
//
// The stylesheet is an APP PREREQUISITE (see packages/video/README.md), so the config injects
// node_modules/video.js/dist/video-js.css into the test page. Auditing an unstyled control bar
// would report nonsense contrast: every color this checks comes from that file.
import { mount, cleanup, make, assert, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/video/dist/index.js";

// Real video.js is a large module resolved through a dynamic import inside dist; give init room.
const INIT_TIMEOUT = 20000;

/** Mount a real dj-video and wait until video.js has actually built its player. */
async function mountRealPlayer(props) {
	const el = await mount(make("dj-video", props));
	await el.updateComplete;
	const deadline = Date.now() + INIT_TIMEOUT;
	while (!el.player() && Date.now() < deadline) {
		await settleFrames();
	}
	assert(el.player(), "video.js built a player through the real createPlayer path");
	await settleFrames();
	return el;
}

describe("dj-video with the real video.js engine (opt-in)", function () {
	this.timeout(INIT_TIMEOUT + 10000);
	afterEach(cleanup);

	it("renders video.js's own control bar, not a stub", async () => {
		const el = await mountRealPlayer({ label: "Lesson one", poster: "/favicon.ico" });
		// Guard before the audit. An axe run over an empty container passes and proves nothing,
		// which is the exact failure mode this file was written to avoid — so assert the thing
		// being audited is present before auditing it.
		assert(el.querySelector(".vjs-control-bar"), "video.js injected its control bar");
		assert(el.querySelectorAll(".vjs-control-bar button").length > 0, "the control bar has controls");
	});

	it("the real control bar has no serious/critical WCAG 2.2 AA violations", async () => {
		const el = await mountRealPlayer({ label: "Lesson one", poster: "/favicon.ico" });
		assert(el.querySelector(".vjs-control-bar"), "control bar present before auditing");
		await assertNoViolations(el);
	});

	it("every control in the bar has an accessible name", async () => {
		const el = await mountRealPlayer({ label: "Lesson one", poster: "/favicon.ico" });
		const unnamed = [...el.querySelectorAll(".vjs-control-bar button")].filter((b) => {
			const name = b.getAttribute("aria-label") || b.title || b.textContent.trim();
			return !name;
		});
		assert(
			unnamed.length === 0,
			`every control is named (unnamed: ${unnamed.map((b) => b.className).join(", ")})`,
		);
	});

	it("carries the accessible name the consumer asked for", async () => {
		const el = await mountRealPlayer({ label: "Lesson one", poster: "/favicon.ico" });
		const video = el.querySelector("video");
		const named =
			(video && (video.getAttribute("aria-label") || video.getAttribute("title"))) ||
			el.getAttribute("aria-label") ||
			(el.player() && el.player().el() && el.player().el().getAttribute("aria-label"));
		// If this fails it is a real finding about dj-video, not about video.js: `label` is the
		// component's own documented accessible-name property and something has to carry it.
		assert(named, "the `label` property reaches an accessible name on the player");
	});
});
