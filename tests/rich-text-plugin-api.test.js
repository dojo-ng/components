// SL1: the plugin-API extension — RichTextContext.plugins exposes the resolved plugin set, and a
// plugin may declare `inserts` (block/insert actions for the slash menu). Mounts the real component
// so #buildEditor runs and populates ctx.plugins.
import { mount } from "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import "../packages/rich-text/dist/index.js";
import { headingsPlugin } from "../packages/rich-text-headings/dist/index.js";

test("ctx.plugins lists the resolved plugin set the editor was built with", async () => {
	let seen;
	const recorder = {
		name: "recorder",
		setup: (ctx) => {
			seen = ctx.plugins;
		},
	};
	// A plugin declaring `inserts` (both static array and factory forms must be accepted).
	const withInserts = {
		name: "with-inserts",
		inserts: [{ id: "foo", label: "Foo", keywords: ["f"], run: () => {} }],
	};
	const withInsertsFn = {
		name: "with-inserts-fn",
		inserts: () => [{ id: "bar", label: "Bar", run: () => {} }],
	};
	const el = await mount("dj-rich-text", { plugins: [recorder, withInserts, withInsertsFn] });

	assert.ok(Array.isArray(seen), "ctx.plugins is an array in setup");
	assert.deepEqual(seen.map((p) => p.name), ["recorder", "with-inserts", "with-inserts-fn"]);
	// The same resolved list is readable after build via the component's plugins property.
	assert.equal(el.plugins.length, 3);
});

test("SL2: headings inserts resolve to paragraph/h1/h2/h3/quote ids", () => {
	assert.deepEqual(
		headingsPlugin.inserts.map((i) => i.id),
		["paragraph", "h1", "h2", "h3", "quote"],
	);
	assert.ok(headingsPlugin.inserts.every((i) => typeof i.run === "function"));
});
