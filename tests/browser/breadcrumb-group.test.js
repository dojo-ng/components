// dj-breadcrumb-group with track, in a real browser with the real History API (C7): a tracked tree
// and a tracked breadcrumb trail on one page, the landmark name and aria-current, and axe.
import { createPubSub } from "@dojo-ng/pubsub";
import { installHistory } from "@dojo-ng/history";
import { mount, cleanup, make, assert, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/breadcrumb-group/dist/index.js";
import "../../packages/tree/dist/index.js";

function nextLocation(h, test = () => true) {
	return new Promise((resolve) => {
		let replayed = false;
		let stop;
		stop = h.subscribe((location) => {
			if (!replayed || !test(location)) return;
			stop?.();
			resolve(location);
		});
		replayed = true;
	});
}

const NODES = [
	{ id: "docs", label: "Docs", children: [{ id: "guide", label: "Guide", children: [{ id: "intro", label: "Intro" }] }, { id: "api", label: "API" }] },
	{ id: "blog", label: "Blog" },
];
const rowOf = (el, id) => el.shadowRoot.querySelector(`li.treeitem[data-id="${id}"]`);
const crumbs = (el) => [...el.shadowRoot.querySelectorAll("li")].map((li) => li.textContent.trim());

describe("dj-breadcrumb-group with track", () => {
	let h;
	beforeEach(() => {
		h = installHistory(createPubSub(), { dwellMs: 0 });
	});
	afterEach(() => {
		h.destroy();
		cleanup();
	});

	it("select a deep tree node, then click a middle crumb: the tree reselects that node", async () => {
		const tree = await mount(make("dj-tree", { nodes: NODES, track: true, basePath: "/bc-test", expanded: ["docs", "guide"] }));
		const group = await mount(make("dj-breadcrumb-group", { track: true }));
		await tree.updateComplete;

		rowOf(tree, "intro").click();
		await tree.updateComplete;
		await group.updateComplete;
		assertEqual(crumbs(group).join("|"), "Docs|Guide|Intro", "one crumb per ancestor, in order");
		assertEqual(group.shadowRoot.querySelector("[aria-current]").textContent.trim(), "Intro", "the last crumb is the current page");
		assertEqual(group.shadowRoot.querySelector("[aria-current]").getAttribute("aria-current"), "page", "marked as the page");

		const arrived = nextLocation(h, (l) => l.path === "/bc-test/docs/guide");
		group.shadowRoot.querySelectorAll("li a")[1].click();
		const location1 = await arrived;
		await tree.updateComplete;
		await group.updateComplete;
		assertEqual(location.pathname, "/bc-test/docs/guide", "the URL is the middle crumb's path");
		assertEqual(tree.value, "guide", "the tree reselected that node");
		assertEqual(JSON.stringify(location1.trail.map((e) => e.label)), JSON.stringify(["Docs", "Guide"]), "the trail is cut at the crumb");
		assertEqual(crumbs(group).length, 2, "the crumbs follow");
	});

	it("the landmark is named Breadcrumb and a tracked trail has no accessibility violations", async () => {
		h.go("/bc-test/a/b", undefined, { trail: [{ path: "/bc-test/a", label: "A" }, { path: "/bc-test/a/b", label: "B" }] });
		const group = await mount(make("dj-breadcrumb-group", { track: true }));
		await group.updateComplete;
		const nav = group.shadowRoot.querySelector("nav");
		assertEqual(nav.getAttribute("aria-label"), "Breadcrumb", "landmark name");
		assert(group.shadowRoot.querySelector(".sep").getAttribute("aria-hidden") === "true", "separators are hidden from screen readers");
		await assertNoViolations(group);
	});
});
