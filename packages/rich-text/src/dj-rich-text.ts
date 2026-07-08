import { html, nothing, type TemplateResult } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import "@dojo-ng/button";
import {
	createEditor, $getRoot, $getSelection, $isRangeSelection,
	COMMAND_PRIORITY_HIGH, PASTE_COMMAND,
	type LexicalEditor, type LexicalCommand, type TextFormatType,
	type DOMConversionMap, type DOMExportOutputMap,
} from "lexical";
import { registerRichText } from "@lexical/rich-text";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $insertGeneratedNodes } from "@lexical/clipboard";
import { mergeRegister } from "@lexical/utils";
import {
	type RichTextPlugin, type RichTextContext, type RichTextToolbarItem, type RichTextFormat,
} from "./plugin.js";
import { defaultPlugins } from "./default-plugins.js";
import { sanitizeHtml } from "./sanitize-html.js";

/** Inline text formats inspected for toolbar active state. */
const TEXT_FORMATS: TextFormatType[] = [
	"bold", "italic", "underline", "strikethrough", "code", "subscript", "superscript", "highlight",
];

/** Built-in HTML serializer. `serialize` runs inside an editor read; `deserialize` inside an update. */
const HTML_FORMAT: RichTextFormat = {
	serialize: (editor) => $generateHtmlFromNodes(editor, null),
	deserialize: (editor, data) => {
		const root = $getRoot();
		root.clear();
		const dom = new DOMParser().parseFromString(data || "<p></p>", "text/html");
		for (const node of $generateNodesFromDOM(editor, dom)) root.append(node);
	},
};

/**
 * `<dj-rich-text>` — a form-associated WYSIWYG editor built on the Lexical core. The editable
 * region renders in LIGHT DOM (Lexical's selection handling is not reliable inside a shadow root
 * yet), so this component overrides `createRenderRoot`; theming still works because `--dj-*` tokens
 * cascade in light DOM.
 *
 * The editor is a PLUGIN HOST: bold/italic/underline and undo/redo ship as the default plugin set
 * (`default-plugins.ts`) and flow through the same {@link RichTextPlugin} API third-party plugins
 * use. Foundational behavior (`registerRichText`, value sync, root-element setup) stays as core.
 * Toolbar controls, node registration, and output formats all come from plugins.
 *
 * Constraint: Lexical needs node classes at creation, so a `plugins` change after creation rebuilds
 * the editor (serialize → recreate → deserialize). Value is HTML by default; the `format` property
 * selects an alternate serializer contributed by a plugin. Event: `dj-change`.
 */
export class DjRichText extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	// Light DOM: required for Lexical selection to work today.
	protected override createRenderRoot() { return this; }

	#internals: ElementInternals;
	#editor?: LexicalEditor;
	#applyingValue = false;
	#built = false;
	#disposers: Array<() => void> = [];
	#active: Set<string> = new Set();
	#selectionSubs = new Set<() => void>();
	#serializers: Record<string, RichTextFormat> = { html: HTML_FORMAT };
	#plugins: RichTextPlugin[] = [];
	#ctx: RichTextContext;
	@query(".dj-rt-editable") private editable!: HTMLElement;

	@property() value = "";
	@property({ reflect: true }) name?: string;
	@property() label?: string;
	@property() placeholder = "";
	@property({ type: Boolean, reflect: true }) disabled = false;
	/** Plugin set. Set in JavaScript (rich data). The default set is used when this is empty. */
	@property({ attribute: false }) plugins: RichTextPlugin[] = [];
	/** Output format; selects which serializer the value getter/setter uses. `"html"` is built in. */
	@property({ reflect: true }) format = "html";
	/** Sanitize pasted HTML against an allowlist (on by default). Set in JS to disable. */
	@property({ attribute: false, type: Boolean }) sanitizePaste = true;
	/** Custom paste sanitizer `(html) => html`; defaults to the built-in allowlist `sanitizeHtml`. */
	@property({ attribute: false }) pasteSanitizer?: (html: string) => string;
	/** Bumped on every selection change to re-render the toolbar's active state. */
	@state() private selVersion = 0;
	/** Becomes true once the editor is built; gates toolbar rendering so plugin toolbar items that
	 *  read the editor (block-type select, list state) never run before the editor exists. */
	@state() private ready = false;

	constructor() {
		super();
		this.#internals = this.attachInternals();
		// Stable context object — safe to read before the editor exists (activeFormats() is empty,
		// command() is a no-op until then). `editor` is a live getter because rebuilds replace it.
		const host = this;
		this.#ctx = {
			get editor(): LexicalEditor { return host.#editor!; },
			host,
			command<P>(type: LexicalCommand<P>, payload: P) {
				host.#editor?.dispatchCommand(type, payload);
				host.focus();
			},
			onSelectionChange(cb: () => void) {
				host.#selectionSubs.add(cb);
				return () => host.#selectionSubs.delete(cb);
			},
			activeFormats: () => host.#active as ReadonlySet<string>,
			get plugins(): readonly RichTextPlugin[] { return host.#plugins; },
		};
	}

	get validity(): ValidityState { return this.#internals.validity; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	override focus(o?: FocusOptions) { this.editable?.focus(o); }
	formResetCallback() { this.#applyValue(this.getAttribute("value") ?? "", HTML_FORMAT); }

	override disconnectedCallback() {
		super.disconnectedCallback();
		this.#teardown();
		this.#built = false;
	}

	protected override updated(c: Map<PropertyKey, unknown>) {
		if (!this.#editor) {
			this.#buildEditor();
		} else if (c.has("plugins") && c.get("plugins") !== undefined) {
			// Genuine post-creation plugin change: rebuild around the new node set, preserving value.
			this.value = this.#serialize();
			this.#teardown();
			this.#buildEditor();
		}
		if (c.has("disabled")) {
			this.#editor?.setEditable(!this.isDisabled);
			if (this.editable) this.editable.contentEditable = this.isDisabled ? "false" : "true";
		}
		if (c.has("format") && !c.has("plugins") && this.#built) this.#syncValue();
	}

	#resolvePlugins(): RichTextPlugin[] {
		return this.plugins.length ? this.plugins : defaultPlugins;
	}

	#currentFormat(): RichTextFormat {
		return this.#serializers[this.format] ?? HTML_FORMAT;
	}

	#buildEditor() {
		const plugins = this.#resolvePlugins();
		this.#plugins = plugins; // expose the resolved set via ctx.plugins (for the slash menu, etc.)
		// Collect node classes contributed by plugins, de-duplicated. The core registers no nodes of
		// its own: heading/quote/list nodes come from their plugins, so an editor only pays for what
		// it loads (an editor without the headings plugin renders pasted headings as paragraphs).
		const nodes = [...new Set(plugins.flatMap((p) => p.nodes ?? []))];
		// Build the format-serializer registry from plugin-contributed formats.
		this.#serializers = { html: HTML_FORMAT };
		for (const p of plugins) if (p.formats) Object.assign(this.#serializers, p.formats);

		// Merge plugin-contributed HTML import/export overrides (later plugins win on tag collisions).
		// This is how the color plugin preserves inline color/background on `value` round-trips, which
		// the default DOM import would otherwise strip.
		const htmlImport: DOMConversionMap = {};
		const htmlExport: DOMExportOutputMap = new Map();
		for (const p of plugins) {
			if (p.html?.import) Object.assign(htmlImport, p.html.import);
			if (p.html?.export) for (const [k, v] of p.html.export) htmlExport.set(k, v);
		}

		const editor = createEditor({
			namespace: "dj-rich-text",
			nodes,
			onError: (e) => console.error("[dj-rich-text]", e),
			html: { import: htmlImport, export: htmlExport },
		});
		this.#editor = editor;
		// Lexical's vanilla setRootElement does NOT make the element editable; we own that.
		this.editable.contentEditable = this.isDisabled ? "false" : "true";
		this.editable.spellcheck = true;
		editor.setRootElement(this.editable);
		editor.setEditable(!this.isDisabled);

		this.#disposers = [
			registerRichText(editor),
			// Sanitize pasted HTML before Lexical's own paste handler runs (higher priority + return
			// true stops it). Plain-text pastes (no text/html) fall through to the safe default.
			editor.registerCommand(
				PASTE_COMMAND,
				(event: ClipboardEvent | InputEvent | KeyboardEvent) => {
					if (!this.sanitizePaste) return false;
					const cd = (event as ClipboardEvent).clipboardData;
					const raw = cd?.getData("text/html");
					if (!raw) return false; // no HTML → let the default handle text/plain
					event.preventDefault();
					const clean = (this.pasteSanitizer ?? sanitizeHtml)(raw);
					editor.update(() => {
						const sel = $getSelection();
						if (!$isRangeSelection(sel)) return;
						const dom = new DOMParser().parseFromString(clean || "", "text/html");
						const nodes = $generateNodesFromDOM(editor, dom);
						// Route through Lexical's own clipboard-insert command (handled by registerRichText),
						// not a bare `selection.insertNodes`: block/"shadow-root" nodes like tables are
						// flattened to their text by the naive path in real browsers, but inserted intact by
						// the command handler. Falls back to insertNodes when nothing consumes the command.
						$insertGeneratedNodes(editor, nodes, sel);
					});
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerUpdateListener(({ editorState }) => {
				editorState.read(() => {
					const sel = $getSelection();
					this.#active = $isRangeSelection(sel)
						? new Set(TEXT_FORMATS.filter((f) => sel.hasFormat(f)))
						: new Set();
				});
				this.selVersion++;                       // re-render toolbar active state
				for (const cb of this.#selectionSubs) cb();
				if (this.#applyingValue) return;          // programmatic value set: don't echo back
				this.#syncValue();
			}),
		];
		// Run each plugin's setup and compose its disposer.
		for (const p of plugins) {
			const dispose = p.setup?.(this.#ctx);
			if (dispose) this.#disposers.push(dispose);
		}
		this.#built = true;
		this.ready = true;                            // re-render so the toolbar shows now that ctx.editor is live
		if (this.value) this.#applyValue(this.value, this.#currentFormat());
	}

	#teardown() {
		mergeRegister(...this.#disposers)();
		this.#disposers = [];
		this.#editor?.setRootElement(null);
		this.#editor = undefined;
		this.ready = false;
	}

	/** Read the editor through the current format's serializer (inside a read scope). */
	#serialize(): string {
		const editor = this.#editor;
		if (!editor) return this.value;
		const fmt = this.#currentFormat();
		return editor.getEditorState().read(() => fmt.serialize(editor));
	}

	/** Push the editor's current content out to `value` / the form, emitting `dj-change` on change. */
	#syncValue() {
		const out = this.#serialize();
		if (out !== this.value) {
			this.value = out;
			this.#internals.setFormValue(out);
			this.emit("dj-change");
		}
	}

	/** Load `data` into the editor through `fmt`'s deserializer; suppresses the echo-back sync. */
	#applyValue(data: string, fmt: RichTextFormat) {
		const editor = this.#editor;
		if (!editor) { this.value = data; return; }
		this.#applyingValue = true;
		editor.update(() => fmt.deserialize(editor, data), {
			onUpdate: () => { this.#applyingValue = false; },
		});
	}

	/** Replace the document with the given HTML (regardless of the active `format`). */
	setHtml(htmlString: string) { this.#applyValue(htmlString, HTML_FORMAT); }

	#icon(icon?: TemplateResult | string) {
		return icon === undefined ? nothing : typeof icon === "string" ? html`${icon}` : icon;
	}

	#renderItem(item: RichTextToolbarItem) {
		if (item.render) return item.render(this.#ctx);
		const pressed = item.isActive ? String(item.isActive(this.#ctx)) : nothing;
		return html`<dj-button
			kind="text"
			aria-pressed=${pressed}
			?disabled=${item.isDisabled ? item.isDisabled(this.#ctx) : false}
			aria-label=${item.label}
			@click=${() => item.run?.(this.#ctx)}
		>${this.#icon(item.icon)}</dj-button>`;
	}

	#toolbarItems(): RichTextToolbarItem[] {
		const items: RichTextToolbarItem[] = [];
		// Keep plugins in array order; sort only WITHIN each plugin by `order` (a stable sort, so
		// items without an `order` keep their relative position). Sorting globally would interleave
		// controls from different plugins.
		for (const p of this.#resolvePlugins()) {
			const t = typeof p.toolbar === "function" ? p.toolbar(this.#ctx) : p.toolbar;
			if (!t) continue;
			const sorted = t
				.map((item, i) => ({ item, i }))
				.sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0) || a.i - b.i)
				.map(({ item }) => item);
			items.push(...sorted);
		}
		return items;
	}

	override render() {
		// Only build toolbar items once the editor exists — plugin items may read ctx.editor.
		const items = this.ready && this.#editor ? this.#toolbarItems() : [];
		let lastGroup: string | undefined;
		const toolbar = items.map((item, idx) => {
			const sep = idx > 0 && item.group !== lastGroup
				? html`<span class="dj-rt-sep" role="separator" aria-orientation="vertical"></span>`
				: nothing;
			lastGroup = item.group;
			return html`${sep}${this.#renderItem(item)}`;
		});
		return html`
			<style>
				dj-rich-text { display: block; font-family: var(--dj-font-family, inherit); }
				dj-rich-text .dj-rt-toolbar { display: flex; align-items: center; gap: .15rem; padding: .25rem; border: 1px solid var(--dj-color-border, #d1d5db); border-bottom: none; border-radius: var(--dj-input-border-radius-medium, .25rem) var(--dj-input-border-radius-medium, .25rem) 0 0; background: var(--dj-color-neutral-50, #f9fafb); }
				dj-rich-text .dj-rt-sep { align-self: stretch; width: 1px; margin: .15rem .25rem; background: var(--dj-color-border, #d1d5db); }
				dj-rich-text .dj-rt-editable { min-height: 8rem; padding: var(--dj-spacing-small, .75rem); border: 1px solid var(--dj-color-border, #d1d5db); border-radius: 0 0 var(--dj-input-border-radius-medium, .25rem) var(--dj-input-border-radius-medium, .25rem); outline: none; background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937); }
				dj-rich-text .dj-rt-editable:focus { border-color: var(--dj-color-primary-600, #2563eb); box-shadow: 0 0 0 1px var(--dj-color-primary-600, #2563eb); }
				@media (forced-colors: active) { dj-rich-text .dj-rt-editable:focus { outline: 2px solid Highlight; outline-offset: -1px; } }
				dj-rich-text[disabled] { opacity: .5; }
			</style>
			${this.label ? html`<label style="display:block;margin-bottom:.25rem;color:var(--dj-color-neutral-700,#374151)">${this.label}</label>` : ""}
			<div class="dj-rt-toolbar" role="toolbar" aria-label="Formatting">${toolbar}</div>
			<div class="dj-rt-editable" role="textbox" aria-multiline="true" aria-label=${this.label || "Rich text editor"} data-placeholder=${this.placeholder}></div>
		`;
	}
}
export default DjRichText;
declare global { interface GlobalEventHandlersEventMap { "dj-change": CustomEvent<Record<string, never>>; } }
