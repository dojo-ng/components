/**
 * Pure color math for `<dj-color-picker>`: parsing, HSV<->RGB conversion, and formatters. No DOM,
 * no dependency — every function is a pure transform, so it is unit-tested directly. Named CSS
 * colors (`red`, `rebeccapurple`, …) are intentionally NOT parsed in v1.
 */

/** RGB with `r`/`g`/`b` in 0–255 and `a` (alpha) in 0–1. */
export interface RGB {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** HSV with `h` in 0–360, `s`/`v` in 0–100, and `a` (alpha) in 0–1. This is the picker's model. */
export interface HSV {
	h: number;
	s: number;
	v: number;
	a: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const round = Math.round;
/** Round alpha to two decimals so formatted strings stay short and stable. */
const roundAlpha = (a: number): number => Math.round(clamp(a, 0, 1) * 100) / 100;

/**
 * Parse a CSS color string to RGB, or `undefined` when it is not a form we accept. Accepts hex
 * (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`), `rgb()/rgba()`, and `hsl()/hsla()` with either
 * comma- or space-separated components (and an optional `/ alpha`). Named colors are not parsed.
 */
export function parseColor(input: string): RGB | undefined {
	if (typeof input !== "string") return undefined;
	const str = input.trim().toLowerCase();
	if (!str) return undefined;
	return parseHex(str) ?? parseFunctional(str);
}

function parseHex(str: string): RGB | undefined {
	const m = /^#([0-9a-f]{3,8})$/.exec(str);
	if (!m) return undefined;
	const h = m[1];
	const hx = (s: string): number => parseInt(s, 16);
	if (h.length === 3) return { r: hx(h[0] + h[0]), g: hx(h[1] + h[1]), b: hx(h[2] + h[2]), a: 1 };
	if (h.length === 4)
		return { r: hx(h[0] + h[0]), g: hx(h[1] + h[1]), b: hx(h[2] + h[2]), a: hx(h[3] + h[3]) / 255 };
	if (h.length === 6) return { r: hx(h.slice(0, 2)), g: hx(h.slice(2, 4)), b: hx(h.slice(4, 6)), a: 1 };
	if (h.length === 8)
		return { r: hx(h.slice(0, 2)), g: hx(h.slice(2, 4)), b: hx(h.slice(4, 6)), a: hx(h.slice(6, 8)) / 255 };
	return undefined;
}

/** Read a component that may be a plain number or a percentage of `max`. */
function component(token: string, max: number): number {
	if (token.endsWith("%")) return (parseFloat(token) / 100) * max;
	return parseFloat(token);
}

function parseAlpha(token: string | undefined): number {
	if (token == null) return 1;
	const a = token.endsWith("%") ? parseFloat(token) / 100 : parseFloat(token);
	return Number.isFinite(a) ? clamp(a, 0, 1) : 1;
}

function parseFunctional(str: string): RGB | undefined {
	const m = /^(rgba?|hsla?)\(([^)]+)\)$/.exec(str);
	if (!m) return undefined;
	const kind = m[1];
	const parts = m[2].split(/[\s,/]+/).filter(Boolean);
	if (parts.length < 3) return undefined;
	if (!parts.every((p, i) => (i < 3 ? isFinite(parseFloat(p)) : true))) return undefined;
	const a = parseAlpha(parts[3]);
	if (kind === "rgb" || kind === "rgba") {
		return {
			r: clamp(round(component(parts[0], 255)), 0, 255),
			g: clamp(round(component(parts[1], 255)), 0, 255),
			b: clamp(round(component(parts[2], 255)), 0, 255),
			a,
		};
	}
	// hsl / hsla
	const h = ((parseFloat(parts[0]) % 360) + 360) % 360;
	const s = clamp(parseFloat(parts[1]), 0, 100);
	const l = clamp(parseFloat(parts[2]), 0, 100);
	return { ...hslToRgb(h, s, l), a };
}

/** HSV (h 0–360, s/v 0–100) to RGB (0–255). Alpha is carried through unchanged. */
export function hsvToRgb(hsv: HSV): RGB {
	const s = clamp(hsv.s, 0, 100) / 100;
	const v = clamp(hsv.v, 0, 100) / 100;
	const h = (((hsv.h % 360) + 360) % 360) / 60;
	const c = v * s;
	const x = c * (1 - Math.abs((h % 2) - 1));
	const m = v - c;
	let r: number, g: number, b: number;
	if (h < 1) [r, g, b] = [c, x, 0];
	else if (h < 2) [r, g, b] = [x, c, 0];
	else if (h < 3) [r, g, b] = [0, c, x];
	else if (h < 4) [r, g, b] = [0, x, c];
	else if (h < 5) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];
	return { r: round((r + m) * 255), g: round((g + m) * 255), b: round((b + m) * 255), a: hsv.a };
}

/** RGB (0–255) to HSV (h 0–360, s/v 0–100). Alpha is carried through unchanged. */
export function rgbToHsv(rgb: RGB): HSV {
	const r = clamp(rgb.r, 0, 255) / 255;
	const g = clamp(rgb.g, 0, 255) / 255;
	const b = clamp(rgb.b, 0, 255) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	let h = 0;
	if (d !== 0) {
		if (max === r) h = ((g - b) / d) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	const s = max === 0 ? 0 : d / max;
	// Keep h/s/v as floats — the model stays high-fidelity and rounding happens only at output,
	// so a color set via `value` round-trips through HSV without drift.
	return { h, s: s * 100, v: max * 100, a: rgb.a };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	const sN = s / 100;
	const lN = l / 100;
	const c = (1 - Math.abs(2 * lN - 1)) * sN;
	const hp = h / 60;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	const m = lN - c / 2;
	let r: number, g: number, b: number;
	if (hp < 1) [r, g, b] = [c, x, 0];
	else if (hp < 2) [r, g, b] = [x, c, 0];
	else if (hp < 3) [r, g, b] = [0, c, x];
	else if (hp < 4) [r, g, b] = [0, x, c];
	else if (hp < 5) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];
	return { r: round((r + m) * 255), g: round((g + m) * 255), b: round((b + m) * 255) };
}

/** RGB (0–255) to HSL with h 0–360, s/l 0–100 (floats; callers round at output). */
export function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
	const r = clamp(rgb.r, 0, 255) / 255;
	const g = clamp(rgb.g, 0, 255) / 255;
	const b = clamp(rgb.b, 0, 255) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const d = max - min;
	const l = (max + min) / 2;
	let h = 0;
	let s = 0;
	if (d !== 0) {
		s = d / (1 - Math.abs(2 * l - 1));
		if (max === r) h = ((g - b) / d) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h, s: s * 100, l: l * 100 };
}

const hex2 = (n: number): string => clamp(round(n), 0, 255).toString(16).padStart(2, "0");

/** Whether to emit alpha: when the caller asks (`alphaOn`) or the color is translucent. */
const includeAlpha = (a: number, alphaOn: boolean): boolean => alphaOn || a < 1;

/** Format RGB as a hex string. Includes the alpha byte when `alphaOn` or the color is translucent. */
export function toHex(rgb: RGB, alphaOn = false): string {
	const base = `#${hex2(rgb.r)}${hex2(rgb.g)}${hex2(rgb.b)}`;
	return includeAlpha(rgb.a, alphaOn) ? base + hex2(rgb.a * 255) : base;
}

/** Format RGB as `rgb()`/`rgba()`. */
export function toRgb(rgb: RGB, alphaOn = false): string {
	const r = clamp(round(rgb.r), 0, 255);
	const g = clamp(round(rgb.g), 0, 255);
	const b = clamp(round(rgb.b), 0, 255);
	return includeAlpha(rgb.a, alphaOn)
		? `rgba(${r}, ${g}, ${b}, ${roundAlpha(rgb.a)})`
		: `rgb(${r}, ${g}, ${b})`;
}

/** Format RGB as `hsl()`/`hsla()`. */
export function toHsl(rgb: RGB, alphaOn = false): string {
	const { h, s, l } = rgbToHsl(rgb);
	const H = round(h);
	const S = round(s);
	const L = round(l);
	return includeAlpha(rgb.a, alphaOn)
		? `hsla(${H}, ${S}%, ${L}%, ${roundAlpha(rgb.a)})`
		: `hsl(${H}, ${S}%, ${L}%)`;
}

export type ColorFormat = "hex" | "rgb" | "hsl";

/** Format RGB in the requested output format. */
export function formatColor(rgb: RGB, format: ColorFormat, alphaOn = false): string {
	if (format === "rgb") return toRgb(rgb, alphaOn);
	if (format === "hsl") return toHsl(rgb, alphaOn);
	return toHex(rgb, alphaOn);
}
