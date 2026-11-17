/** Matching a key combination written as text, such as `Alt+T` or `Ctrl+Shift+N`. */

const MODIFIERS: Record<string, "altKey" | "ctrlKey" | "shiftKey" | "metaKey"> = {
	alt: "altKey", option: "altKey",
	ctrl: "ctrlKey", control: "ctrlKey",
	shift: "shiftKey",
	meta: "metaKey", cmd: "metaKey", command: "metaKey",
};

/**
 * True when `event` is the combination `shortcut` names. Letters and digits match by physical key
 * (`event.code`), because on macOS Option+T types "†" and `event.key` never reads "t".
 * An empty shortcut never matches.
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
	const parts = shortcut.split("+").map((p) => p.trim().toLowerCase()).filter(Boolean);
	const key = parts.pop();
	if (!key) return false;
	const wanted = new Set(parts.map((p) => MODIFIERS[p]).filter(Boolean));
	for (const flag of ["altKey", "ctrlKey", "shiftKey", "metaKey"] as const) {
		if (Boolean(event[flag]) !== wanted.has(flag)) return false;
	}
	if (/^[a-z]$/.test(key)) return event.code === `Key${key.toUpperCase()}`;
	if (/^[0-9]$/.test(key)) return event.code === `Digit${key}`;
	return event.key.toLowerCase() === key;
}
