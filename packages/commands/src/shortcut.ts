/** Shortcut text such as `Mod+K`, `Alt+Mod+Digit1` or the sequence `G I`: parsing, matching, display. */
import { messages, registerDefaults } from "@dojo-ng/i18n";

export type Platform = "mac" | "other";

/** One key press: the physical key and exactly the modifiers held with it. */
export interface Step {
	code: string;
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
	meta: boolean;
}

/** How long a sequence waits for its next key. */
export const SEQUENCE_GAP_MS = 1000;

registerDefaults("dj", {
	keyCtrl: "Ctrl", keyAlt: "Alt", keyShift: "Shift", keyMeta: "Meta",
	keyEscape: "Esc", keyEnter: "Enter", keySpace: "Space", keyTab: "Tab",
	keyBackspace: "Backspace", keyDelete: "Delete", keyHome: "Home", keyEnd: "End",
	keyPageUp: "PgUp", keyPageDown: "PgDn",
});

/** `"mac"` for macOS and iOS, where Mod is Cmd and Option changes the typed character. */
export function detectPlatform(): Platform {
	const nav = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { userAgentData?: { platform?: string } });
	const name = nav?.userAgentData?.platform || nav?.platform || "";
	return /mac|iphone|ipad|ipod/i.test(name) ? "mac" : "other";
}

const MODIFIER_NAMES: Record<string, "mod" | "ctrl" | "alt" | "shift" | "meta"> = {
	mod: "mod", ctrl: "ctrl", control: "ctrl", alt: "alt", option: "alt",
	shift: "shift", meta: "meta", cmd: "meta", command: "meta",
};

const NAMED_KEYS: Record<string, string> = {
	enter: "Enter", return: "Enter", escape: "Escape", esc: "Escape", space: "Space", tab: "Tab",
	backspace: "Backspace", delete: "Delete", del: "Delete", home: "Home", end: "End",
	pageup: "PageUp", pagedown: "PageDown",
	up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
	arrowup: "ArrowUp", arrowdown: "ArrowDown", arrowleft: "ArrowLeft", arrowright: "ArrowRight",
	period: "Period", comma: "Comma", slash: "Slash", semicolon: "Semicolon", quote: "Quote",
	bracketleft: "BracketLeft", bracketright: "BracketRight", backslash: "Backslash",
	minus: "Minus", equal: "Equal", backquote: "Backquote",
};

const PUNCTUATION: Record<string, { code: string; shift?: boolean }> = {
	".": { code: "Period" }, ",": { code: "Comma" }, "/": { code: "Slash" }, ";": { code: "Semicolon" },
	"'": { code: "Quote" }, "[": { code: "BracketLeft" }, "]": { code: "BracketRight" },
	"\\": { code: "Backslash" }, "-": { code: "Minus" }, "=": { code: "Equal" }, "`": { code: "Backquote" },
	"?": { code: "Slash", shift: true },
};

function keyToCode(token: string): { code: string; shift?: boolean } | undefined {
	const lower = token.toLowerCase();
	if (/^[a-z]$/.test(lower)) return { code: `Key${lower.toUpperCase()}` };
	if (/^[0-9]$/.test(lower)) return { code: `Digit${lower}` };
	if (/^(key[a-z]|digit[0-9]|f([1-9]|1[0-2]))$/.test(lower)) return { code: lower[0]!.toUpperCase() + lower.slice(1) };
	if (PUNCTUATION[token]) return PUNCTUATION[token];
	if (NAMED_KEYS[lower]) return { code: NAMED_KEYS[lower]! };
}

/** One step such as `Mod+K`. Throws on a key or modifier it does not know, so a typo fails at registration. */
export function parseStep(text: string, platform: Platform): Step {
	const parts = text.split(/\+(?=.)/).map((p) => p.trim());
	const keyToken = parts.pop();
	const step: Step = { code: "", ctrl: false, alt: false, shift: false, meta: false };
	for (const part of parts) {
		const name = MODIFIER_NAMES[part.toLowerCase()];
		if (!name) throw new Error(`Unknown modifier "${part}" in shortcut "${text}"`);
		if (name === "mod") step[platform === "mac" ? "meta" : "ctrl"] = true;
		else step[name] = true;
	}
	const key = keyToken ? keyToCode(keyToken) : undefined;
	if (!key) throw new Error(`Unknown key "${keyToken ?? ""}" in shortcut "${text}"`);
	step.code = key.code;
	if (key.shift) step.shift = true;
	return step;
}

/** A shortcut: one step, or several separated by spaces (`G I`). */
export function parseShortcut(text: string, platform: Platform): Step[] {
	const steps = text.trim().split(/\s+/).filter(Boolean).map((s) => parseStep(s, platform));
	if (steps.length === 0) throw new Error("Empty shortcut");
	return steps;
}

export function stepOf(event: KeyboardEvent): Step {
	return { code: event.code, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, meta: event.metaKey };
}

export function sameStep(a: Step, b: Step): boolean {
	return a.code === b.code && a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta;
}

/** A stable text form, used to detect two commands bound to the same keys. */
export function normalizeShortcut(steps: Step[]): string {
	return steps.map((s) => `${s.ctrl ? "C" : ""}${s.alt ? "A" : ""}${s.shift ? "S" : ""}${s.meta ? "M" : ""}:${s.code}`).join(" ");
}

const RESERVED_CODES = new Set(["KeyW", "KeyT", "KeyN", "KeyQ"]);

/** Mod+W, Mod+T, Mod+N and Mod+Q belong to the browser, which will not let a page have them. */
export function isReserved(steps: Step[], platform: Platform): boolean {
	const s = steps[0]!;
	const mod = platform === "mac" ? s.meta && !s.ctrl : s.ctrl && !s.meta;
	return steps.length === 1 && mod && !s.alt && !s.shift && RESERVED_CODES.has(s.code);
}

const KEY_LABELS: Record<string, string> = {
	Escape: "keyEscape", Enter: "keyEnter", Space: "keySpace", Tab: "keyTab", Backspace: "keyBackspace",
	Delete: "keyDelete", Home: "keyHome", End: "keyEnd", PageUp: "keyPageUp", PageDown: "keyPageDown",
};
const ARROWS: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
const SIGNS: Record<string, string> = {
	Period: ".", Comma: ",", Slash: "/", Semicolon: ";", Quote: "'", BracketLeft: "[", BracketRight: "]",
	Backslash: "\\", Minus: "-", Equal: "=", Backquote: "`",
};

function keyLabel(code: string, locale: string): string {
	if (code.startsWith("Key")) return code.slice(3);
	if (code.startsWith("Digit")) return code.slice(5);
	if (ARROWS[code]) return ARROWS[code]!;
	if (SIGNS[code]) return SIGNS[code]!;
	const id = KEY_LABELS[code];
	return (id && messages.resolve("dj", locale, id)) || code;
}

function stepLabel(step: Step, platform: Platform, locale: string): string {
	const key = keyLabel(step.code, locale);
	const name = (id: string) => messages.resolve("dj", locale, id) ?? id;
	if (platform === "mac") {
		// The Mac order: Control, Option, Shift, Command, then the key, with no separators.
		return `${step.ctrl ? "⌃" : ""}${step.alt ? "⌥" : ""}${step.shift ? "⇧" : ""}${step.meta ? "⌘" : ""}${key}`;
	}
	const mods = [step.ctrl && name("keyCtrl"), step.alt && name("keyAlt"), step.shift && name("keyShift"), step.meta && name("keyMeta")];
	return [...mods.filter(Boolean), key].join("+");
}

/** How to show a shortcut to a person: `⌘K` on a Mac, `Ctrl+K` elsewhere; a sequence reads `G I`. */
export function formatShortcut(shortcut: string, options: { platform?: Platform; locale?: string } = {}): string {
	const platform = options.platform ?? detectPlatform();
	const locale = options.locale ?? "en";
	return parseShortcut(shortcut, platform).map((s) => stepLabel(s, platform, locale)).join(" ");
}
