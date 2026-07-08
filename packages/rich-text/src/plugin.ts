import type { LexicalCommand, LexicalEditor, LexicalNode, Klass, DOMConversionMap, DOMExportOutputMap } from "lexical";
import type { TemplateResult } from "lit";

/**
 * Plugin API for `<dj-rich-text>`. A plugin is a plain object (or a factory returning one) that
 * can contribute Lexical nodes, register commands/transforms/listeners, add toolbar controls, and
 * supply alternate output formats. The component's own bold/italic/underline and undo/redo ship as
 * the default plugin set (see `default-plugins.ts`), so even the basics flow through this API.
 *
 * KEY CONSTRAINT: Lexical needs its custom node classes at editor-creation time, so a plugin that
 * contributes `nodes` must be declared before the editor is built. Changing the `plugins` property
 * after creation rebuilds the editor (serialize → recreate → deserialize).
 */

/** What a plugin can see and do. Passed to `setup()` and to toolbar item callbacks. */
export interface RichTextContext {
	/** The live Lexical editor. */
	readonly editor: LexicalEditor;
	/** The `dj-rich-text` host element (focus, events, requestUpdate). */
	readonly host: HTMLElement;
	/** Dispatch a Lexical command, then return focus to the editor. */
	command<P>(type: LexicalCommand<P>, payload: P): void;
	/** Subscribe to selection/format changes; returns a disposer. Drives toolbar active state. */
	onSelectionChange(cb: () => void): () => void;
	/** The current selection's active inline formats (`bold`, `italic`, …). */
	activeFormats(): ReadonlySet<string>;
	/**
	 * The resolved plugin list the editor was built with (empty array before the editor is built).
	 * Used by aggregating plugins such as the slash menu to gather every loaded plugin's `inserts`.
	 */
	readonly plugins: readonly RichTextPlugin[];
}

/**
 * A block/insert action a plugin exposes to a command menu (the slash menu). Aggregated across all
 * loaded plugins by `@dojo-ng/rich-text-slash`. When run, the menu has already removed the "/query"
 * trigger text and the caret sits in that block. `run` executes within the removal `editor.update` so
 * a block transform keeps the caret's selection (a separate update would lose it); a nested
 * `editor.update`, a command dispatch, or opening a dialog all work from here.
 */
export interface RichTextInsertItem {
	id: string;
	label: string;
	icon?: TemplateResult | string;
	keywords?: string[];
	run(ctx: RichTextContext): void;
}

/**
 * A toolbar control contributed by a plugin. Either a simple command button (`run` + optional
 * `icon`/`isActive`/`isDisabled`) or a fully custom control (`render`). `label` is the accessible
 * name and is always required so plugins cannot regress accessibility.
 */
export interface RichTextToolbarItem {
	id: string;
	/** Controls grouping; a separator is rendered between items of differing groups. */
	group?: string;
	/** Sort order within the toolbar (ascending; ties keep insertion order). */
	order?: number;
	/** Accessible name (required). */
	label: string;
	// --- Simple command button ---
	icon?: TemplateResult | string;
	/** Reflected as `aria-pressed`. Re-evaluated on selection change. */
	isActive?(ctx: RichTextContext): boolean;
	isDisabled?(ctx: RichTextContext): boolean;
	run?(ctx: RichTextContext): void;
	// --- Or a custom control (dropdown, color picker, block-type select) ---
	render?(ctx: RichTextContext): TemplateResult;
}

/**
 * An alternate output format a plugin can add (for example Markdown). The component invokes
 * `serialize` inside an editor read scope and `deserialize` inside an editor update scope, so
 * implementations call the `$`-prefixed Lexical helpers directly without their own `read`/`update`.
 */
export interface RichTextFormat {
	serialize(editor: LexicalEditor): string;
	deserialize(editor: LexicalEditor, data: string): void;
}

export interface RichTextPlugin {
	name: string;
	/** Custom nodes this plugin needs. Registered at editor creation; see the rebuild note above. */
	nodes?: Klass<LexicalNode>[];
	/** Register commands, transforms, and listeners. Return a disposer (or compose with `mergeRegister`). */
	setup?(ctx: RichTextContext): (() => void) | void;
	/** Toolbar controls, static or derived from context. */
	toolbar?: RichTextToolbarItem[] | ((ctx: RichTextContext) => RichTextToolbarItem[]);
	/** Optional alternate output formats, keyed by name (for example `"markdown"`). */
	formats?: Record<string, RichTextFormat>;
	/**
	 * Block/insert actions this plugin exposes to a command menu (the slash menu). Static, or a
	 * function of context so a plugin can vary its offerings. Resolved once per menu open.
	 */
	inserts?: RichTextInsertItem[] | ((ctx: RichTextContext) => RichTextInsertItem[]);
	/**
	 * Optional HTML import/export overrides passed to `createEditor`'s `html` config. `import` is a
	 * `DOMConversionMap` merged across plugins (later plugins win on tag collisions); it lets a plugin
	 * preserve markup the default converters drop — for example the color plugin uses it to keep inline
	 * `color`/`background-color` on `value` round-trips (the default DOM import strips them). `export`
	 * is the matching `DOMExportOutputMap`.
	 */
	html?: { import?: DOMConversionMap; export?: DOMExportOutputMap };
}

/** Identity helper for typing and authoring a plugin. */
export const defineRichTextPlugin = (p: RichTextPlugin): RichTextPlugin => p;
