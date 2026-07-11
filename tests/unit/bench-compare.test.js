// Unit test for the benchmark gate's pure comparison logic (the browser bench file just measures
// timings and calls this). Runs in Node under Vitest — no DOM needed.
import { describe, it, expect } from "vitest";
import { compareBench, isBaselineEmpty, fmt } from "../bench-compare.js";

describe("isBaselineEmpty", () => {
	it("is true for an empty or missing baseline", () => {
		expect(isBaselineEmpty(undefined)).toBe(true);
		expect(isBaselineEmpty(null)).toBe(true);
		expect(isBaselineEmpty({})).toBe(true);
	});
	it("is false once metrics are recorded", () => {
		expect(isBaselineEmpty({ gridMount: 12 })).toBe(false);
	});
});

describe("compareBench (relative 2× gate)", () => {
	const baseline = { gridMount: 100, gridScroll: 50, chartRender: 40 };

	it("passes when every metric is within tolerance", () => {
		const r = compareBench({ gridMount: 150, gridScroll: 90, chartRender: 40 }, baseline, 2);
		expect(r.pass).toBe(true);
		expect(r.rows).toHaveLength(3);
	});

	it("passes exactly at the limit (measured == baseline × tolerance)", () => {
		const r = compareBench({ gridMount: 200, gridScroll: 100, chartRender: 80 }, baseline, 2);
		expect(r.pass).toBe(true);
	});

	it("fails when any metric exceeds the limit", () => {
		const r = compareBench({ gridMount: 201, gridScroll: 90, chartRender: 40 }, baseline, 2);
		expect(r.pass).toBe(false);
		expect(r.rows.find((x) => x.key === "gridMount").ok).toBe(false);
	});

	it("fails when a baseline metric is missing from the measurement", () => {
		const r = compareBench({ gridMount: 150, gridScroll: 90 }, baseline, 2);
		expect(r.pass).toBe(false);
		expect(r.rows.find((x) => x.key === "chartRender").ok).toBe(false);
	});

	it("ignores extra measured metrics not in the baseline", () => {
		const r = compareBench({ gridMount: 150, gridScroll: 90, chartRender: 40, extra: 9999 }, baseline, 2);
		expect(r.pass).toBe(true);
		expect(r.rows.map((x) => x.key)).not.toContain("extra");
	});

	it("respects a tighter tolerance", () => {
		expect(compareBench({ gridMount: 150 }, { gridMount: 100 }, 1.2).pass).toBe(false);
		expect(compareBench({ gridMount: 110 }, { gridMount: 100 }, 1.2).pass).toBe(true);
	});
});

describe("fmt", () => {
	it("rounds to one decimal and dashes non-numbers", () => {
		expect(fmt(12.345)).toBe("12.3");
		expect(fmt(undefined)).toBe("—");
		expect(fmt(Infinity)).toBe("—");
	});
});
