/** Input types that do not take typed text. Keys pressed on them keep their host widget meaning
 *  (Space on a row checkbox still selects the row). */
const NON_TEXT_INPUT_TYPES = new Set(["checkbox", "radio", "button", "submit", "reset", "image", "file", "color", "range", "hidden"]);
const TEXT_ROLES = new Set(["textbox", "searchbox", "combobox"]);

/**
 * Whether a key event started in a control the user types into: a text `input`, a `textarea`,
 * a `select`, a `contenteditable` element, or an element with `role="textbox"`, `"searchbox"`
 * or `"combobox"`. Reads the composed target, so a native input inside another component's
 * shadow root (a `dj-text-input`) counts. A composite widget (grid, board) calls this first in
 * its key handler and returns when it is true, so Space, Home, End and the arrows reach the
 * control instead of moving the widget.
 */
export function isTextEntryTarget(e: Event): boolean {
	const t = e.composedPath()[0];
	if (!(t instanceof Element)) return false;
	const tag = t.localName;
	if (tag === "textarea" || tag === "select") return true;
	if (tag === "input") return !NON_TEXT_INPUT_TYPES.has(((t as HTMLInputElement).type || "text").toLowerCase());
	if ((t as HTMLElement).isContentEditable) return true;
	const role = t.getAttribute("role");
	return role !== null && TEXT_ROLES.has(role);
}
