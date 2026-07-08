// Small shared helpers for the browser suites. No external assertion library: the
// suites throw on failure, which is all the test framework needs, and this keeps the
// browser layer's dependency surface to WTR + Playwright + axe.

/** Append a node to the document body and await its first render (if it's a Lit element). */
export async function mount(node) {
	document.body.append(node);
	if (node.updateComplete) await node.updateComplete;
	return node;
}

/** Remove everything mounted during a test. Call in afterEach. */
export function cleanup() {
	document.body.innerHTML = "";
}

/** Create an element, assign properties, and set text/children in one call. */
export function make(tag, props = {}, text) {
	const el = document.createElement(tag);
	Object.assign(el, props);
	if (text != null) el.textContent = text;
	return el;
}

export function assert(condition, message) {
	if (!condition) throw new Error(message || "assertion failed");
}

export function assertEqual(actual, expected, message) {
	if (actual !== expected) {
		throw new Error(`${message ? message + ": " : ""}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
}

/** Resolve after one animation frame. */
export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/** Resolve after two animation frames — enough for rAF-throttled work to settle. */
export const settleFrames = async () => {
	await nextFrame();
	await nextFrame();
};
