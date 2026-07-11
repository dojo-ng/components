// dj-pagination, in a real browser: clicking a page button navigates and emits dj-page, the
// current page is marked aria-current; plus axe.
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/pagination/dist/index.js";

describe("dj-pagination", () => {
	afterEach(cleanup);

	it("clicking a page button emits dj-page and marks the current page", async () => {
		// Start mid-range so a sibling page number is actually rendered (windowing hides far pages).
		const el = await mount(make("dj-pagination", { total: 10, page: 5 }));
		await el.updateComplete;
		let detail;
		el.addEventListener("dj-page", (e) => { detail = e.detail; });

		const six = [...el.shadowRoot.querySelectorAll('[part="page"]')].find((b) => b.textContent.trim() === "6");
		assert(six, "a button for the sibling page 6 renders");
		six.click();
		await el.updateComplete;
		assert(detail && detail.page === 6, "dj-page carries the chosen page");
		const current = el.shadowRoot.querySelector('[aria-current="page"]');
		assertEqual(current.textContent.trim(), "6", "page 6 is now current");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-pagination", { total: 10, page: 4 }));
		await el.updateComplete;
		await assertNoViolations(el);
	});
});
