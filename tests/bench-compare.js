// Pure comparison logic for the component benchmark gate, factored out so it can be unit-tested
// in Node (see tests/unit/bench-compare.test.js) without a browser. The gate is RELATIVE: each
// measured timing must stay within `tolerance`× its checked-in baseline (default 2×). Absolute
// millisecond thresholds are banned — CI machines vary — so this never compares against a
// constant, only against the baseline the team seeded and reviewed.

/** Round to one decimal for display. */
export function fmt(ms) {
	return typeof ms === "number" && isFinite(ms) ? String(Math.round(ms * 10) / 10) : "—";
}

/** True when no baseline has been recorded yet (first run seeds it). */
export function isBaselineEmpty(baseline) {
	return !baseline || typeof baseline !== "object" || Object.keys(baseline).length === 0;
}

/**
 * Compare measured timings against a baseline at a relative tolerance.
 * Every metric present in the baseline must exist in `measured` and be ≤ baseline × tolerance.
 * Extra metrics in `measured` that aren't in the baseline are ignored (informational only).
 *
 * @param {Record<string, number>} measured
 * @param {Record<string, number>} baseline
 * @param {number} tolerance  e.g. 2 for a 2× gate
 * @returns {{ pass: boolean, rows: Array<{key,measured,baseline,limit,ok}>, table: string }}
 */
export function compareBench(measured, baseline, tolerance) {
	const rows = [];
	let pass = true;
	for (const key of Object.keys(baseline)) {
		const b = baseline[key];
		const m = measured ? measured[key] : undefined;
		const limit = b * tolerance;
		const ok = typeof m === "number" && isFinite(m) && m <= limit;
		if (!ok) pass = false;
		rows.push({ key, measured: m, baseline: b, limit, ok });
	}
	const table = rows
		.map((r) => `  ${r.ok ? "OK  " : "FAIL"} ${r.key}: ${fmt(r.measured)}ms  (baseline ${fmt(r.baseline)}ms, limit ${fmt(r.limit)}ms @ ${tolerance}×)`)
		.join("\n");
	return { pass, rows, table };
}
