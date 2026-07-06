/**
 * Idempotent, document-level style injection for light-DOM rich-text plugins.
 *
 * The `dj-rich-text` component renders in the light DOM, so plugin content styles must live as global
 * selectors (e.g. `dj-rich-text table { ... }`) in `document.head`. Plugins that add editable content
 * (tables, checklists, mentions, embeds) call `ensureEditorStyles(id, css)` once during `setup`; the
 * `id` guards against duplicate `<style>` elements when several editors mount.
 */

/**
 * Append a `<style id={id}>` with the given CSS to `document.head`, unless an element with that id
 * already exists. Safe to call repeatedly with the same id (a no-op after the first call). No-op when
 * there is no `document` (e.g. a non-DOM environment).
 */
export function ensureEditorStyles(id: string, css: string): void {
	if (typeof document === "undefined" || !document.head) return;
	if (document.getElementById(id)) return;
	const style = document.createElement("style");
	style.id = id;
	style.textContent = css;
	document.head.appendChild(style);
}
