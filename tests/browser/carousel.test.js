// dj-carousel, in a real browser: the next control advances the settled index and emits
// dj-slide-change; plus axe on a populated carousel.
import { mount, cleanup, make, assert, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/carousel/dist/index.js";

function build() {
	const el = make("dj-carousel", { label: "Gallery" });
	el.append(make("div", {}, "Slide 1"), make("div", {}, "Slide 2"), make("div", {}, "Slide 3"));
	return el;
}

describe("dj-carousel", () => {
	afterEach(cleanup);

	it("the next control advances and emits dj-slide-change", async () => {
		const el = await mount(build());
		await el.updateComplete;
		await settleFrames();
		let detail;
		el.addEventListener("dj-slide-change", (e) => { detail = e.detail; });

		el.shadowRoot.querySelector('[part="next"]').click();
		await el.updateComplete;
		assert(detail && detail.index === 1, "advancing moves the settled index to 1");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(build());
		await el.updateComplete;
		await settleFrames();
		await assertNoViolations(el);
	});
});
