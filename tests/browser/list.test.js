// dj-list, in a real browser: active-descendant keyboard navigation with real key
// events and focus, pointer selection, and an axe pass on a populated, labelled list.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/list/dist/index.js";

const OPTIONS = [
	{ value: "a", label: "Apple" },
	{ value: "b", label: "Banana" },
	{ value: "c", label: "Cherry" },
];

describe("dj-list", () => {
	afterEach(cleanup);

	it("active-descendant keyboard navigation, then Enter selects", async () => {
		const el = await mount(make("dj-list", { options: OPTIONS, label: "Fruit" }));
		let changes = 0;
		el.addEventListener("change", () => changes++);

		el.focus(); // the listbox is the single tab stop
		await sendKeys({ press: "ArrowDown" }); // active → index 0 (Apple)
		await sendKeys({ press: "ArrowDown" }); // active → index 1 (Banana)
		await el.updateComplete;

		const listbox = el.shadowRoot.querySelector('[part="list"]');
		assertEqual(listbox.getAttribute("aria-activedescendant"), "opt-1", "active-descendant should point at the active item");

		await sendKeys({ press: "Enter" });
		assertEqual(el.value, "b", "Enter should select the active item");
		assertEqual(changes, 1, "selection should emit exactly one change");
	});

	it("clicking an item selects it and emits change", async () => {
		const el = await mount(make("dj-list", { options: OPTIONS, label: "Fruit" }));
		let changes = 0;
		el.addEventListener("change", () => changes++);

		const items = el.shadowRoot.querySelectorAll('[part="item"]');
		assertEqual(items.length, 3, "one item per option");
		items[2].click();
		assertEqual(el.value, "c", "clicking selects that item");
		assertEqual(changes, 1, "click should emit one change");
	});

	it("has no serious or critical accessibility violations", async () => {
		const el = await mount(make("dj-list", { options: OPTIONS, label: "Fruit" }));
		await el.updateComplete;
		await assertNoViolations(el);
	});

	it("shows group headings and hints, skips headings with the keyboard, and counts only options", async () => {
		const el = await mount(make("dj-list", {
			label: "Commands",
			options: [
				{ value: "h1", label: "File", heading: true },
				{ value: "save", label: "Save", hint: "Ctrl+S" },
				{ value: "open", label: "Open" },
				{ value: "h2", label: "View", heading: true },
				{ value: "zoom", label: "Zoom", hint: "Ctrl+=" },
			],
		}));
		const root = el.shadowRoot;
		assertEqual([...root.querySelectorAll(".heading")].map((h) => h.textContent.trim()).join("|"), "File|View");
		assertEqual([...root.querySelectorAll(".hint")].map((h) => h.textContent.trim()).join("|"), "Ctrl+S|Ctrl+=");
		assertEqual(root.querySelectorAll('li[role="option"]').length, 3, "headings are not options");
		el.activateFirst();
		el.moveActive(1);
		el.moveActive(1);
		await el.updateComplete;
		assertEqual(el.activeOption?.value, "zoom", "the arrow steps over the heading");
		el.moveActive(1);
		assertEqual(el.activeOption?.value, "save", "and wraps past the first heading");
		await el.updateComplete;
		el.shadowRoot.querySelector(".heading").click();
		assertEqual(el.value, "", "a heading cannot be chosen");
		await assertNoViolations(el);
	});
});
