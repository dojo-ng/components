/** Plain-array technical indicators. No chart, no plugin, no DOM — tested on their own. */

/** Simple moving average. `null` for every index before the window fills. */
export function sma(values: number[], period: number): Array<number | null> {
	const out: Array<number | null> = new Array(values.length).fill(null);
	if (period <= 0) return out;
	let sum = 0;
	for (let i = 0; i < values.length; i++) {
		sum += values[i];
		if (i >= period) sum -= values[i - period];
		if (i >= period - 1) out[i] = sum / period;
	}
	return out;
}

/** Exponential moving average, seeded by the SMA of the first `period` values. */
export function ema(values: number[], period: number): Array<number | null> {
	const out: Array<number | null> = new Array(values.length).fill(null);
	if (period <= 0 || values.length < period) return out;
	const k = 2 / (period + 1);
	let sum = 0;
	for (let i = 0; i < period; i++) sum += values[i];
	let prev = sum / period;
	out[period - 1] = prev;
	for (let i = period; i < values.length; i++) {
		prev = values[i] * k + prev * (1 - k);
		out[i] = prev;
	}
	return out;
}

/** Bollinger bands: SMA midline plus/minus `k` population standard deviations of the same window. */
export function bollinger(
	values: number[],
	period: number,
	k = 2,
): Array<{ mid: number; upper: number; lower: number } | null> {
	const mids = sma(values, period);
	const out: Array<{ mid: number; upper: number; lower: number } | null> = new Array(values.length).fill(null);
	for (let i = 0; i < values.length; i++) {
		const mid = mids[i];
		if (mid === null) continue;
		let sumSq = 0;
		for (let j = i - period + 1; j <= i; j++) {
			const d = values[j] - mid;
			sumSq += d * d;
		}
		const stdev = Math.sqrt(sumSq / period);
		out[i] = { mid, upper: mid + k * stdev, lower: mid - k * stdev };
	}
	return out;
}
