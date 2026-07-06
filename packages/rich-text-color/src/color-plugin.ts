import { html } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import {
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	TextNode,
	type BaseSelection,
	type DOMConversionMap,
	type DOMConversionOutput,
} from "lexical";
import { $getSelectionStyleValueForProperty, $patchStyleText } from "@lexical/selection";
import { defineRichTextPlugin, type RichTextContext, type RichTextPlugin } from "@dojo-ng/rich-text";
import "@dojo-ng/color-picker";
import "@dojo-ng/popup";
import "@dojo-ng/button";

/**
 * Text/background color plugin for `<dj-rich-text>`. Color is an inline `TextNode` style, so this
 * plugin contributes NO nodes: it applies `color` (or `background-color`) to the current selection
 * via `$patchStyleText`. The toolbar control is a `dj-button` whose icon is a swatch chip of the
 * selection's current color; clicking it opens a `dj-popup` with a `dj-color-picker` and a
 * "Remove color" button.
 *
 * Live apply: the picker's `dj-change` patches the selection immediately (a live preview during a
 * drag), without stealing focus, so the popup stays open. Lexical preserves the range selection in
 * its editor state while focus is in the popup, so no save/restore is needed. The popup light-
 * dismisses (outside click / Escape); on dismiss and on "Remove color" focus returns to the editor.
 *
 * Paste caveat: the default paste sanitizer strips inline `style`, so pasted colored text loses its
 * color. Color round-trips through the `value` property (which does not pass the paste sanitizer);
 * a trusted app can supply its own `pasteSanitizer`.
 */

export type StyleProperty = "color" | "background-color";
export type ColorSwatch = string | { value: string; label?: string };

export interface ColorPluginOptions {
	/** Which inline style to set. Default `"color"`. */
	styleProperty?: StyleProperty;
	/** Accessible label for the toolbar control. */
	label?: string;
	/** Swatches offered in the picker. */
	swatches?: ColorSwatch[];
}

const DEFAULT_SWATCHES: ColorSwatch[] = [
	{ value: "#000000", label: "Black" },
	{ value: "#e11d48", label: "Red" },
	{ value: "#ea580c", label: "Orange" },
	{ value: "#ca8a04", label: "Yellow" },
	{ value: "#16a34a", label: "Green" },
	{ value: "#2563eb", label: "Blue" },
	{ value: "#7c3aed", label: "Purple" },
	{ value: "#ffffff", label: "White" },
];

/** The current selection's value for `styleProperty` (empty string when none / mixed). */
export function currentColor(ctx: RichTextContext, styleProperty: StyleProperty): string {
	let color = "";
	ctx.editor.getEditorState().read(() => {
		const sel = $getSelection();
		if ($isRangeSelection(sel)) color = $getSelectionStyleValueForProperty(sel, styleProperty, "");
	});
	return color;
}

/** Patch (or clear, with `null`) the style on the current range selection. Does not move focus. */
export function applyColor(ctx: RichTextContext, styleProperty: StyleProperty, value: string | null): void {
	ctx.editor.update(() => {
		const sel = $getSelection();
		if ($isRangeSelection(sel)) $patchStyleText(sel, { [styleProperty]: value });
	});
}

/**
 * HTML import overrides that preserve inline `color`/`background-color` on the text produced by DOM
 * import. The default DOM converters (from `TextNode.importDOM`) drop these, so a value set via the
 * `value` property would lose its colors on the export→import round-trip. We wrap each of TextNode's
 * tag converters, adding a `forChild` that copies the element's `color`/`background-color` onto the
 * resulting text node. Contributed through the plugin API's `html.import` hook.
 */
export function colorStyleImportMap(): DOMConversionMap {
	const map: DOMConversionMap = {};
	const textConversions = TextNode.importDOM?.() ?? {};
	for (const tag of Object.keys(textConversions)) {
		const original = textConversions[tag];
		map[tag] = (node: HTMLElement) => {
			const conv = original(node);
			if (!conv) return null;
			const innerConversion = conv.conversion;
			return {
				...conv,
				conversion: (element: HTMLElement): DOMConversionOutput | null => {
					const out = innerConversion(element);
					if (!out) return out;
					const style = (element as HTMLElement).style;
					const color = style ? style.color : "";
					const background = style ? style.backgroundColor : "";
					if (!color && !background) return out;
					const originalForChild = out.forChild;
					return {
						...out,
						forChild: (child, parent) => {
							const result = originalForChild ? originalForChild(child, parent) : child;
							if ($isTextNode(result)) {
								const extra = [
									color ? `color: ${color}` : "",
									background ? `background-color: ${background}` : "",
								]
									.filter(Boolean)
									.join("; ");
								const existing = result.getStyle();
								result.setStyle(existing ? `${existing}; ${extra}` : extra);
							}
							return result;
						},
					};
				},
			};
		};
	}
	return map;
}

/** Build a color plugin. `styleProperty` selects text vs background color. */
export function createColorPlugin(options: ColorPluginOptions = {}): RichTextPlugin {
	const styleProperty = options.styleProperty ?? "color";
	const isBg = styleProperty === "background-color";
	const label = options.label ?? (isBg ? "Highlight color" : "Text color");
	const swatches = options.swatches ?? DEFAULT_SWATCHES;
	const popupRef = createRef<HTMLElement & { open: boolean; anchor?: HTMLElement }>();
	const triggerRef = createRef<HTMLElement>();
	const pickerRef = createRef<HTMLElement & { value: string }>();
	// The selection captured when the popup opens. We restore it before each live apply so the color
	// previews on exactly the originally-selected text — never drifting or growing even if a stray
	// pointer event reaches the editor mid-drag — and re-snapshot after (since $patchStyleText splits
	// text nodes, which would otherwise make the saved keys stale).
	let saved: BaseSelection | null = null;

	return defineRichTextPlugin({
		name: isBg ? "background-color" : "color",
		// Preserve inline color/background on `value` round-trips (the default DOM import drops them).
		html: { import: colorStyleImportMap() },
		toolbar: [
			{
				id: isBg ? "background-color" : "color",
				group: "color",
				order: isBg ? 1 : 0,
				label,
				render: (ctx) => {
					const color = currentColor(ctx, styleProperty);
					const openPopup = () => {
						const p = popupRef.value;
						if (!p) return;
						p.anchor = triggerRef.value ?? undefined;
						// Snapshot the selection, and seed the picker from it once (uncontrolled thereafter).
						ctx.editor.getEditorState().read(() => {
							const s = $getSelection();
							saved = s ? s.clone() : null;
						});
						if (pickerRef.value) pickerRef.value.value = currentColor(ctx, styleProperty) || "#000000";
						p.open = true;
					};
					// Live apply to the snapshot selection (restore it first so the preview never drifts;
					// re-snapshot after, since $patchStyleText splits text nodes and moves the keys).
					const applyLive = (value: string | null) => {
						ctx.editor.update(() => {
							if (saved) $setSelection(saved.clone());
							const s = $getSelection();
							if (!$isRangeSelection(s)) return;
							$patchStyleText(s, { [styleProperty]: value });
							const after = $getSelection();
							if (after) saved = after.clone();
						});
					};
					return html`
						<span class="dj-rt-color">
							<dj-button
								${ref(triggerRef)}
								class="dj-rt-color-trigger"
								label=${label}
								title=${label}
								@click=${openPopup}
							>
								<span
									slot="icon"
									class="dj-rt-color-chip"
									style="display:inline-block;width:1em;height:1em;border:1px solid currentColor;border-radius:2px;background:${color ||
									"transparent"}"
								></span>
							</dj-button>
							<dj-popup ${ref(popupRef)} position="below" .scrollLock=${false} @dj-close=${() => ctx.host.focus()}>
								<div style="padding:var(--dj-spacing-small,0.75rem);display:flex;flex-direction:column;gap:var(--dj-spacing-small,0.75rem)">
									<dj-color-picker
										${ref(pickerRef)}
										label=${label}
										.swatches=${swatches}
										@dj-change=${(e: CustomEvent<{ value: string }>) => applyLive(e.detail.value)}
									></dj-color-picker>
									<dj-button
										kind="text"
										@click=${() => {
											applyLive(null);
											if (popupRef.value) popupRef.value.open = false;
											ctx.host.focus();
										}}
										>Remove color</dj-button
									>
								</div>
							</dj-popup>
						</span>
					`;
				},
			},
		],
	});
}

/** Text color plugin (sets inline `color`). */
export const colorPlugin = createColorPlugin();
/** Background/highlight color plugin (sets inline `background-color`). */
export const backgroundColorPlugin = createColorPlugin({ styleProperty: "background-color" });

export default colorPlugin;
