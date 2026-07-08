import { html } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import {
	$createParagraphNode,
	$getSelection,
	$insertNodes,
	$isNodeSelection,
	$isRootOrShadowRoot,
	$nodesOfType,
	COMMAND_PRIORITY_EDITOR,
	createCommand,
	type LexicalCommand,
} from "lexical";
import { $wrapNodeInElement, mergeRegister } from "@lexical/utils";
import { getDefaultLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import { defineRichTextPlugin, ensureEditorStyles, type RichTextContext, type RichTextPlugin } from "@dojo-ng/rich-text";
import "@dojo-ng/dialog";
import "@dojo-ng/text-input";
import "@dojo-ng/button";
import { $createEmbedNode, EmbedNode } from "./embed-node.js";
import { defaultMatchers, matchEmbed, type EmbedMatcher, type EmbedPayload } from "./matchers.js";

const EN: Record<string, string> = {
	insertEmbed: "Insert embed",
	embedUrl: "Media URL",
	embedUnsupported: "This link is not a supported embed",
	insert: "Insert",
	cancel: "Cancel",
};
registerDefaults("dj", EN);

/** Insert a media embed. Payload: `{ kind, src, title? }`. */
export const INSERT_EMBED_COMMAND: LexicalCommand<EmbedPayload> = createCommand("INSERT_EMBED_COMMAND");

const EMBED_ICON = html`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm6 4v8l6-4z"/></svg>`;

const EMBED_CSS = `
dj-rich-text .dj-rt-embed { display: block; max-width: var(--dj-rich-text-embed-max-width, 640px); margin: 0.5rem 0; }
dj-rich-text .dj-rt-embed iframe, dj-rich-text .dj-rt-embed dj-video { display: block; width: 100%; aspect-ratio: 16 / 9; border: 0; }
dj-rich-text .dj-rt-embed dj-audio { display: block; width: 100%; }
dj-rich-text .dj-rt-embed[data-selected] { outline: 2px solid var(--dj-color-primary, #2563eb); outline-offset: 2px; }
`;

/** Options for {@link createEmbedPlugin}. */
export interface EmbedPluginOptions {
	/** Matchers tried in order (default {@link defaultMatchers}). Add your own to support more hosts. */
	matchers?: EmbedMatcher[];
}

/**
 * Media-embed plugin for `<dj-rich-text>` (not a custom element). Contributes `EmbedNode` and an
 * `INSERT_EMBED_COMMAND`, mounts each embed decorator into its container, and adds a toolbar button
 * that opens a `dj-dialog` for pasting a media URL. The URL is run through the matchers; a match
 * inserts the embed, an unsupported link shows an inline error and keeps the dialog open.
 *
 * YouTube/Vimeo render as privacy-enhanced iframes; direct video/audio files render via `dj-video`/
 * `dj-audio`. Paste caveat: the sanitizer removes `iframe` and strips the embed div's attributes, so
 * a pasted embed degrades to a plain link — embeds enter via the dialog, the command, or the `value`
 * property (the node's own importDOM). `dj-video` requires video.js loaded at the document level.
 */
export function createEmbedPlugin(options: EmbedPluginOptions = {}): RichTextPlugin {
	const matchers = options.matchers ?? defaultMatchers;
	const dialogRef = createRef<HTMLElement & { open: boolean }>();
	const urlRef = createRef<HTMLInputElement & { value: string }>();
	const insertRef = createRef<HTMLButtonElement & { disabled: boolean }>();
	const errorRef = createRef<HTMLElement>();

	const msg = (ctx: RichTextContext, key: string): string => {
		const locale = ctx.host.getAttribute("lang") || getDefaultLocale();
		return messages.resolve("dj", locale, key) ?? EN[key] ?? key;
	};

	return defineRichTextPlugin({
		name: "embed",
		nodes: [EmbedNode],
		setup: (ctx) => {
			ensureEditorStyles("dj-rich-text-embed", EMBED_CSS);
			return mergeRegister(
				ctx.editor.registerCommand(
					INSERT_EMBED_COMMAND,
					(payload) => {
						const node = $createEmbedNode(payload);
						$insertNodes([node]);
						if ($isRootOrShadowRoot(node.getParentOrThrow())) {
							$wrapNodeInElement(node, $createParagraphNode).selectEnd();
						}
						return true;
					},
					COMMAND_PRIORITY_EDITOR,
				),
				// Mount each decorator element into its container span.
				ctx.editor.registerDecoratorListener<HTMLElement>((decorators) => {
					for (const [key, el] of Object.entries(decorators)) {
						const container = ctx.editor.getElementByKey(key);
						if (container && el.parentNode !== container) container.appendChild(el);
					}
				}),
				// Reflect NodeSelection onto containers as `data-selected` for styling.
				ctx.editor.registerUpdateListener(() => {
					ctx.editor.getEditorState().read(() => {
						const sel = $getSelection();
						const selected = $isNodeSelection(sel)
							? new Set(sel.getNodes().map((n) => n.getKey()))
							: new Set<string>();
						for (const node of $nodesOfType(EmbedNode)) {
							const container = ctx.editor.getElementByKey(node.getKey());
							if (!container) continue;
							if (selected.has(node.getKey())) container.setAttribute("data-selected", "");
							else container.removeAttribute("data-selected");
						}
					});
				}),
			);
		},
		toolbar: [
			{
				id: "embed",
				group: "embed",
				order: 0,
				label: "Insert embed",
				render: (ctx) => {
					const insertEmbed = msg(ctx, "insertEmbed");
					const showError = (show: boolean) => {
						if (errorRef.value) errorRef.value.style.display = show ? "block" : "none";
					};
					const openDialog = () => {
						if (urlRef.value) urlRef.value.value = "";
						if (insertRef.value) insertRef.value.disabled = true;
						showError(false);
						if (dialogRef.value) dialogRef.value.open = true;
					};
					const closeDialog = () => {
						if (dialogRef.value) dialogRef.value.open = false;
					};
					const syncInsert = () => {
						if (insertRef.value) insertRef.value.disabled = !(urlRef.value?.value ?? "").trim();
						showError(false);
					};
					const doInsert = () => {
						const url = (urlRef.value?.value ?? "").trim();
						if (!url) return;
						const payload = matchEmbed(url, matchers);
						if (!payload) {
							showError(true);
							return;
						}
						ctx.command(INSERT_EMBED_COMMAND, payload);
						closeDialog();
					};
					return html`
						<span class="dj-rt-embed-tool">
							<dj-button label=${insertEmbed} title=${insertEmbed} @click=${openDialog}>
								<span slot="icon">${EMBED_ICON}</span>
							</dj-button>
							<dj-dialog ${ref(dialogRef)} closeable>
								<span slot="title">${insertEmbed}</span>
								<div style="display:flex;flex-direction:column;gap:var(--dj-spacing-small,0.75rem);min-width:22rem">
									<dj-text-input
										${ref(urlRef)}
										label=${msg(ctx, "embedUrl")}
										@input=${syncInsert}
									></dj-text-input>
									<div
										${ref(errorRef)}
										role="alert"
										style="display:none;color:var(--dj-color-danger-600,#dc2626);font-size:0.875rem"
									>${msg(ctx, "embedUnsupported")}</div>
								</div>
								<div slot="actions">
									<dj-button ${ref(insertRef)} disabled kind="contained" @click=${doInsert}
										>${msg(ctx, "insert")}</dj-button
									>
									<dj-button kind="text" @click=${closeDialog}>${msg(ctx, "cancel")}</dj-button>
								</div>
							</dj-dialog>
						</span>
					`;
				},
			},
		],
	});
}

/** The embed plugin with the default matchers. */
export const embedPlugin = createEmbedPlugin();

export default embedPlugin;
