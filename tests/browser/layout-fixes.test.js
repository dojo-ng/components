// Layout papercuts from the Josh playground report: dj-stack `wrap`, dj-card's empty actions
// strip, and dj-nav collapsing to zero width inside dj-header's leading/trailing slots.
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import "../../packages/stack/dist/index.js";
import "../../packages/card/dist/index.js";
import "../../packages/header/dist/index.js";
import "../../packages/nav/dist/index.js";

afterEach(cleanup);
const width = (el) => el.getBoundingClientRect().width;
const height = (el) => el.getBoundingClientRect().height;

describe("dj-stack wrap", () => {
	it("keeps items on one line by default and wraps them with `wrap`", async () => {
		const stack = make("dj-stack", { direction: "horizontal" });
		stack.style.width = "200px";
		for (const t of ["aaa", "bbb", "ccc"]) { const s = make("span", {}, t); s.style.cssText = "width:90px;flex:none"; stack.append(s); }
		await mount(stack);
		const one = height(stack);
		stack.wrap = true;
		await stack.updateComplete;
		assert(height(stack) > one * 1.5, "wrapped onto more lines");
		assert(stack.hasAttribute("wrap"), "reflected");
	});
});

describe("dj-card actions strip", () => {
	it("draws no strip with nothing slotted, and draws it once something is", async () => {
		const card = make("dj-card", { title: "T" }, "body");
		await mount(card);
		const strip = card.shadowRoot.querySelector(".actions");
		assertEqual(height(strip), 0, "no strip");
		const btn = make("button", { slot: "actions" }, "Go");
		card.append(btn);
		await settleFrames();
		assert(height(strip) > 0, "strip appears");
		btn.remove();
		await settleFrames();
		assertEqual(height(strip), 0, "and goes again");
	});
	it("draws the strip at first paint when actions are already there", async () => {
		const card = make("dj-card", { title: "T" }, "body");
		card.append(make("button", { slot: "actions" }, "Go"));
		await mount(card);
		assert(height(card.shadowRoot.querySelector(".actions")) > 0);
	});
});

describe("dj-nav in dj-header", () => {
	for (const slot of ["leading", "trailing"]) {
		it(`has width in the ${slot} slot`, async () => {
			const header = make("dj-header");
			header.style.width = "900px";
			const nav = make("dj-nav", { slot });
			nav.append(make("a", { href: "#" }, "One"), make("a", { href: "#" }, "Two"));
			header.append("Title", nav);
			await mount(header);
			await settleFrames();
			assert(width(nav) > 50, `dj-nav width ${width(nav)}`);
		});
	}
});
