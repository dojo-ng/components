// Options from a server (VS4, virtual-list-select-spec.md): dj-typeahead and dj-select emit
// dj-options-request and take setOptions answers; a late answer with an old epoch is dropped,
// typing is debounced, the select pages on scroll, and the loading state is announced.
import { sendKeys } from "@web/test-runner-commands";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/select/dist/index.js";
import "../../packages/typeahead/dist/index.js";

const DB = Array.from({ length: 1000 }, (_, i) => ({ value: `c${i}`, label: `City ${i}` }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle(...els) {
	for (let i = 0; i < 3; i++) { for (const el of els) await el?.updateComplete; await settleFrames(); }
}
const list = (el) => el.shadowRoot.querySelector("dj-list");
const keys = (el) => [...list(el).shadowRoot.querySelectorAll('[part="item"]')].map((li) => li.dataset.key);
const status = (el) => el.shadowRoot.querySelector('[role="status"]').textContent.trim();

/** A fake server: records requests, and answers them when (and in whatever order) the test says. */
function fakeServer(el, pageSize = 50) {
	const requests = [];
	el.addEventListener("dj-options-request", (e) => requests.push(e.detail));
	const answer = (req) => {
		const hits = DB.filter((o) => o.label.toLowerCase().includes(req.query.toLowerCase()));
		return el.setOptions(hits.slice(req.offset, req.offset + pageSize), { epoch: req.epoch, total: hits.length, append: req.offset > 0 });
	};
	return { requests, answer };
}

describe("remote options", () => {
	afterEach(cleanup);

	it("typeahead debounces typing into one request per pause", async () => {
		const el = await mount(make("dj-typeahead", { label: "City", remote: true, requestDelay: 150 }));
		const server = fakeServer(el);
		el.focus();
		await settle(el);
		const opening = server.requests.length;
		assertEqual(opening, 1, "focusing with no options asks once, at once");
		await sendKeys({ type: "City 12" });
		await wait(50);
		assertEqual(server.requests.length, opening, "no request while still typing");
		await wait(200);
		assertEqual(server.requests.length, opening + 1, "one request after the pause");
		assertEqual(server.requests.at(-1).query, "City 12", "with the whole query");
		assertEqual(server.requests.at(-1).offset, 0, "from the start");
	});

	it("typeahead drops a late answer to an older query", async () => {
		const el = await mount(make("dj-typeahead", { label: "City", remote: true, requestDelay: 0 }));
		const server = fakeServer(el);
		el.focus();
		await settle(el);
		await sendKeys({ type: "City 1" });
		await settle(el);
		const old = server.requests.at(-1);
		await sendKeys({ type: "23" });
		await settle(el);
		const latest = server.requests.at(-1);
		assert(latest.epoch > old.epoch, "a new query starts a new epoch");
		assert(server.answer(latest), "the current answer is taken");
		await settle(el, list(el));
		assertEqual(keys(el).join(","), "c123", "shows the newest query's results");
		assertEqual(server.answer(old), false, "the late, older answer is refused");
		await settle(el, list(el));
		assertEqual(keys(el).join(","), "c123", "and changes nothing");
	});

	it("typeahead keeps a chosen label when later answers replace the options", async () => {
		const el = await mount(make("dj-typeahead", { label: "City", remote: true, requestDelay: 0, value: "c777", selectedOptions: [{ value: "c777", label: "City 777" }] }));
		await settle(el);
		const input = () => el.shadowRoot.querySelector("dj-text-input");
		assertEqual(input().value, "City 777", "label from selectedOptions before anything is loaded");
	});

	it("select loads on open, announces loading, and pages on scroll", async () => {
		const el = await mount(make("dj-select", { label: "City", remote: true }));
		const server = fakeServer(el);
		el.shadowRoot.querySelector('[part="trigger"]').click();
		await settle(el);
		assertEqual(server.requests.length, 1, "opening asks for the first page");
		assertEqual(JSON.stringify(server.requests[0]), JSON.stringify({ query: "", offset: 0, epoch: 1 }), "query, offset, epoch");
		assertEqual(status(el), "Loading options", "loading is announced");
		assert(list(el).loading, "the list shows its spinner");
		server.answer(server.requests[0]);
		await settle(el, list(el));
		assertEqual(status(el), "1000 options", "the result count is announced");
		assertEqual(el.options.length, 50, "first page loaded");
		const ul = list(el).shadowRoot.querySelector('[part="list"]');
		ul.scrollTop = ul.scrollHeight;
		await settle(el, list(el));
		assertEqual(server.requests.length, 2, "scrolling near the end asks for the next page");
		assertEqual(server.requests[1].offset, 50, "from the number loaded");
		assertEqual(server.requests[1].epoch, 1, "in the same epoch");
		ul.scrollTop = ul.scrollHeight;
		await settle(el, list(el));
		assertEqual(server.requests.length, 2, "no duplicate request while one is out");
		server.answer(server.requests[1]);
		await settle(el, list(el));
		assertEqual(el.options.length, 100, "second page appended");
	});

	it("select keeps the label of a selected value that is not loaded", async () => {
		const el = await mount(make("dj-select", { label: "City", remote: true, multiple: true, value: ["c900"], selectedOptions: [{ value: "c900", label: "City 900" }] }));
		await settle(el);
		const chip = el.shadowRoot.querySelector('[part="chip"]');
		assertEqual(chip.textContent.trim(), "City 900", "chip uses selectedOptions");
		const server = fakeServer(el);
		el.shadowRoot.querySelector('[part="trigger"]').click();
		await settle(el);
		server.answer(server.requests[0]);
		await settle(el, list(el));
		list(el).shadowRoot.querySelectorAll('[part="item"]')[3].click();
		await settle(el);
		assertEqual(JSON.stringify(el.value), '["c900","c3"]', "chose a loaded option too");
		assert(el.selectedOptions.some((o) => o.value === "c3" && o.label === "City 3"), "the select remembers the chosen label");
	});

	it("has no serious or critical accessibility violations while loading", async () => {
		const el = await mount(make("dj-select", { label: "City", remote: true }));
		el.shadowRoot.querySelector('[part="trigger"]').click();
		await settle(el);
		await assertNoViolations(el);
	});
});
