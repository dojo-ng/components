/**
 * Allowlist HTML sanitizer for pasted content. Security and consistency hook: strips anything not
 * on the allowlist so pasted markup can't smuggle scripts, event handlers, inline styles, or unsafe
 * URLs into the editor, and pastes land as clean structural/formatting HTML.
 *
 * It parses with `DOMParser` (which does NOT execute scripts), walks the tree, removes dangerous
 * elements outright, unwraps other disallowed elements (keeping their text), strips every attribute
 * not explicitly allowed for a tag, and drops unsafe `href`/`src` URLs. Returns clean HTML.
 */

/** Allowed elements → the attributes each may keep. Everything else is stripped. */
const ALLOWED: Record<string, string[]> = {
	a: ["href", "title", "target", "rel"],
	p: [], br: [], hr: [],
	h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
	blockquote: [], pre: [], code: [],
	ul: [], ol: ["start", "type"], li: [],
	strong: [], b: [], em: [], i: [], u: [], s: [], strike: [], del: [], ins: [],
	sub: [], sup: [], mark: [], span: [],
	table: [], thead: [], tbody: [], tfoot: [], tr: [], caption: [],
	th: ["colspan", "rowspan"], td: ["colspan", "rowspan"],
};

/** Elements removed entirely, content and all (never merely unwrapped). */
const REMOVE = new Set([
	"script", "style", "iframe", "object", "embed", "noscript", "template", "link", "meta", "base",
	"head", "title", "form", "input", "button", "textarea", "select", "option", "svg", "math",
	"audio", "video", "source", "track", "canvas", "applet", "frame", "frameset",
]);

/** True for URLs safe to keep: http(s)/mailto/tel, or relative/anchor. Any other scheme is rejected. */
function safeUrl(url: string): boolean {
	const v = url.trim();
	if (/^(https?:|mailto:|tel:)/i.test(v)) return true;
	if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return false; // some other scheme (javascript:, data:, vbscript:, …)
	return true; // relative path, query, or #anchor
}

function stripAttrs(el: Element, allowed: string[]): void {
	for (const attr of Array.from(el.attributes)) {
		const name = attr.name.toLowerCase();
		if (!allowed.includes(name)) {
			el.removeAttribute(attr.name);
			continue;
		}
		if ((name === "href" || name === "src") && !safeUrl(attr.value)) {
			el.removeAttribute(attr.name);
		}
	}
}

/** Depth-first: clean descendants, then keep-and-strip (allowed) or unwrap (disallowed) each child. */
function sanitizeChildren(parent: Element): void {
	for (const child of Array.from(parent.children)) {
		const tag = child.tagName.toLowerCase();
		if (REMOVE.has(tag)) {
			child.remove();
			continue;
		}
		sanitizeChildren(child); // clean the subtree first, so unwrapped children are already clean
		const allowed = ALLOWED[tag];
		if (allowed) {
			stripAttrs(child, allowed);
		} else {
			// Unwrap: promote the (already-cleaned) children in place of the disallowed element.
			while (child.firstChild) parent.insertBefore(child.firstChild, child);
			child.remove();
		}
	}
}

/** Sanitize an HTML string to the allowlist and return clean HTML. */
export function sanitizeHtml(input: string): string {
	const doc = new DOMParser().parseFromString(input ?? "", "text/html");
	sanitizeChildren(doc.body);
	return doc.body.innerHTML;
}
