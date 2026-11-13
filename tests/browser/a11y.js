// Accessibility assertion shared by every browser suite. Runs axe-core over an
// element's subtree with the WCAG 2.2 AA rule sets and fails on any `serious` or
// `critical` violation (the pass bar in docs/qa-requirements.md). `moderate` and
// `minor` violations are logged to the console for triage but do not fail the run.
//
// axe traverses shadow DOM on its own, so pass the component host as the context.
//
// axe-core ships a UMD bundle with no ESM export; loaded as a module it just assigns
// the global `axe` (window.axe). So import it for its side effect and read the global
// rather than `import axe from "axe-core"` (which has no `default` export).
import "axe-core";
const axe = globalThis.axe;

// WCAG 2.2 AA = the 2.0/2.1/2.2 A and AA rule sets.
const WCAG_22_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const BLOCKING = new Set(["serious", "critical"]);

/** Find the element an axe target names: one selector per shadow root, outermost first. */
function resolveTarget(target) {
	let root = document;
	let el = null;
	for (const sel of target.flat()) {
		el = root.querySelector(sel);
		if (!el) return null;
		root = el.shadowRoot ?? el;
	}
	return el;
}

/**
 * axe 4.12 reads `aria-controls` only as an attribute and does not know ARIA element reflection
 * (`ariaControlsElements`). A combobox inside one shadow root that controls a list in another
 * (dj-typeahead's input inside dj-text-input) can only point at it through reflection, so axe
 * reports aria-required-attr for a relation the browser exposes. Drop exactly those nodes: the
 * rule is aria-required-attr, and the node has a non-empty `ariaControlsElements`. In an engine
 * without reflection the property is missing, the node stays, and the test still fails there.
 */
function withoutReflectedControls(v) {
	if (v.id !== "aria-required-attr") return v;
	const nodes = v.nodes.filter((n) => {
		const el = resolveTarget(n.target);
		return !(el && el.ariaControlsElements?.length);
	});
	return { ...v, nodes };
}

/**
 * Throw if `el`'s subtree has any serious/critical WCAG 2.2 AA violation.
 * @param {Element} el element to audit (must be connected to the document)
 */
export async function assertNoViolations(el) {
	const results = await axe.run(el, {
		runOnly: { type: "tag", values: WCAG_22_AA_TAGS },
		resultTypes: ["violations"],
	});

	const violations = results.violations.map(withoutReflectedControls).filter((v) => v.nodes.length);
	const blocking = violations.filter((v) => BLOCKING.has(v.impact));
	const softer = violations.filter((v) => !BLOCKING.has(v.impact));

	for (const v of softer) {
		console.warn(`axe [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} node(s); ${v.helpUrl}`);
	}

	if (blocking.length) {
		const detail = blocking
			.map((v) => {
				const targets = v.nodes.map((n) => `      ${n.target.join(" ")}`).join("\n");
				return `  [${v.impact}] ${v.id}: ${v.help}\n${targets}`;
			})
			.join("\n");
		throw new Error(
			`axe found ${blocking.length} serious/critical WCAG 2.2 AA violation(s):\n${detail}`,
		);
	}
}
