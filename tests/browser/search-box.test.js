// dj-search-box, in a real browser: typing a configured key: with options opens the suggestion
// popup, choosing one commits a chip and emits dj-query-change, Enter outside token mode emits
// dj-search, and an axe pass both at rest and with the suggestion popup OPEN — a closed popup
// audits almost nothing.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/search-box/dist/index.js";

const KEYS = [
	{ key: "from", label: "From", options: [{ value: "alice", label: "Alice" }, { value: "amir", label: "Amir" }] },
	{ key: "status", label: "Status" },
];

describe("dj-search-box", () => {
	afterEach(cleanup);

	it("typing a configured key: with options opens a suggestion popup; choosing one commits a chip", async () => {
		const el = await mount(make("dj-search-box", { keys: KEYS, label: "Search" }));
		await el.updateComplete;
		let changes = 0;
		el.addEventListener("dj-query-change", () => changes++);

		el.focus();
		await sendKeys({ type: "from:a" });
		await el.updateComplete;
		await settleFrames();

		const items = el.shadowRoot.querySelector("dj-list").shadowRoot.querySelectorAll('[part="item"]');
		assertEqual(items.length, 2, "both options match the typed prefix");
		items[0].click();
		await el.updateComplete;
		await settleFrames();

		assertEqual(el.query.tokens.length, 1, "the chosen suggestion committed a token");
		assertEqual(el.query.tokens[0].value, "alice", "the token carries the chosen value");
		assert(el.shadowRoot.querySelector("dj-chip"), "a chip renders for the committed filter");
		assert(changes >= 1, "committing a filter emits dj-query-change");
	});

	it("Enter with free text outside token mode emits dj-search with the query", async () => {
		const el = await mount(make("dj-search-box", { keys: KEYS, label: "Search" }));
		await el.updateComplete;
		let detail;
		el.addEventListener("dj-search", (e) => { detail = e.detail.query; });

		el.focus();
		await sendKeys({ type: "urgent" });
		await sendKeys({ press: "Enter" });
		await el.updateComplete;

		assertEqual(detail.text, "urgent", "dj-search carries the typed free text");
	});

	it("has no serious or critical accessibility violations, at rest and with the popup open", async () => {
		const el = await mount(make("dj-search-box", { keys: KEYS, label: "Search" }));
		await el.updateComplete;
		await assertNoViolations(el);

		el.focus();
		await sendKeys({ type: "from:a" });
		await el.updateComplete;
		await settleFrames();
		await assertNoViolations(el);
	});
});
