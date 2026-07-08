import { html, nothing } from "lit";
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
import { defineRichTextPlugin, type RichTextContext, type RichTextPlugin } from "@dojo-ng/rich-text";
import "@dojo-ng/file-input";
import "@dojo-ng/dialog";
import "@dojo-ng/text-input";
import "@dojo-ng/button";
import { $createImageNode, ImageNode, type ImagePayload } from "./image-node.js";

const EN: Record<string, string> = {
	insertImage: "Insert image",
	imageUrl: "Image URL",
	imageAlt: "Alternative text",
	insert: "Insert",
	cancel: "Cancel",
};
registerDefaults("dj", EN);

/** Insert an image. Payload: `{ src, alt, width?, height? }`. */
export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand("INSERT_IMAGE_COMMAND");

const IMAGE_ICON = html`<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M21 5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zm-1 12H4l4-5 2.5 3 3.5-4.5L20 17z"/><circle cx="8" cy="9" r="1.5"/></svg>`;

export interface ImagePluginOptions {
	/** Resolve a picked file to an image `src`. Default reads the file to a data URL. */
	upload?: (file: File) => Promise<string>;
	/** Optional per-file size cap (bytes) for the picker's file input. Default: no limit. */
	maxSize?: number;
}

/** Default uploader: read the file to a data URL. Data URLs bloat the HTML value — pass a real uploader in production. */
const defaultUpload = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});

/**
 * Image plugin for `<dj-rich-text>`. Contributes `ImageNode` and an `INSERT_IMAGE_COMMAND`, mounts
 * each image decorator element into its container (vanilla decorator pattern), and adds a toolbar
 * button that opens a `dj-dialog` for inserting an image from a file (via `dj-file-input`) or a URL,
 * with a REQUIRED alt text (the insert button is disabled until alt is non-empty — an accessible
 * name is mandatory). The default uploader produces a data URL; pass `upload` for real hosting.
 *
 * Paste caveat: the default paste sanitizer drops `<img>` tags, so images enter via the dialog or
 * the `value` property, not paste. Do not change the sanitizer.
 */
export function createImagePlugin(options: ImagePluginOptions = {}): RichTextPlugin {
	const upload = options.upload ?? defaultUpload;
	const maxSize = options.maxSize;
	const dialogRef = createRef<HTMLElement & { open: boolean }>();
	const fileRef = createRef<HTMLElement & { files: File[] }>();
	const urlRef = createRef<HTMLInputElement & { value: string }>();
	const altRef = createRef<HTMLInputElement & { value: string }>();
	const insertRef = createRef<HTMLButtonElement & { disabled: boolean }>();
	let lastSource: "file" | "url" = "url";

	const msg = (ctx: RichTextContext, key: string): string => {
		const locale = (ctx.host.getAttribute("lang") || getDefaultLocale());
		return messages.resolve("dj", locale, key) ?? EN[key] ?? key;
	};

	return defineRichTextPlugin({
		name: "image",
		nodes: [ImageNode],
		// Slash-menu entry: open the same insert dialog. `dialogRef` is factory-scoped, and the dialog
		// element always renders with the toolbar, so the ref resolves once the editor is ready.
		inserts: [
			{
				id: "image", label: "Image", keywords: ["image", "img", "picture", "photo"],
				run: () => { if (dialogRef.value) dialogRef.value.open = true; },
			},
		],
		setup: (ctx) =>
			mergeRegister(
				ctx.editor.registerCommand(
					INSERT_IMAGE_COMMAND,
					(payload) => {
						const node = $createImageNode(payload);
						$insertNodes([node]);
						if ($isRootOrShadowRoot(node.getParentOrThrow())) {
							$wrapNodeInElement(node, $createParagraphNode).selectEnd();
						}
						return true;
					},
					COMMAND_PRIORITY_EDITOR,
				),
				// Mount each decorator <img> into its container span.
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
						for (const node of $nodesOfType(ImageNode)) {
							const container = ctx.editor.getElementByKey(node.getKey());
							if (!container) continue;
							if (selected.has(node.getKey())) container.setAttribute("data-selected", "");
							else container.removeAttribute("data-selected");
						}
					});
				}),
			),
		toolbar: [
			{
				id: "image",
				group: "image",
				order: 0,
				label: "Insert image",
				render: (ctx) => {
					const insertImage = msg(ctx, "insertImage");
					const openDialog = () => {
						if (dialogRef.value) dialogRef.value.open = true;
					};
					const closeDialog = () => {
						if (dialogRef.value) dialogRef.value.open = false;
					};
					const syncInsert = () => {
						if (insertRef.value) insertRef.value.disabled = !(altRef.value?.value ?? "").trim();
					};
					const doInsert = async () => {
						const alt = (altRef.value?.value ?? "").trim();
						if (!alt) return;
						let src = "";
						const files = fileRef.value?.files ?? [];
						const url = (urlRef.value?.value ?? "").trim();
						if (lastSource === "file" && files.length) src = await upload(files[0]);
						else if (url) src = url;
						else if (files.length) src = await upload(files[0]);
						if (!src) return;
						ctx.command(INSERT_IMAGE_COMMAND, { src, alt });
						closeDialog();
					};
					return html`
						<span class="dj-rt-image-tool">
							<dj-button label=${insertImage} title=${insertImage} @click=${openDialog}>
								<span slot="icon">${IMAGE_ICON}</span>
							</dj-button>
							<dj-dialog ${ref(dialogRef)} closeable>
								<span slot="title">${insertImage}</span>
								<div style="display:flex;flex-direction:column;gap:var(--dj-spacing-small,0.75rem);min-width:20rem">
									<dj-file-input
										${ref(fileRef)}
										accept="image/*"
										max-size=${maxSize ?? nothing}
										label=${insertImage}
										@dj-change=${() => {
											lastSource = "file";
											syncInsert();
										}}
									></dj-file-input>
									<dj-text-input
										${ref(urlRef)}
										label=${msg(ctx, "imageUrl")}
										@input=${() => {
											lastSource = "url";
											syncInsert();
										}}
									></dj-text-input>
									<dj-text-input
										${ref(altRef)}
										label=${msg(ctx, "imageAlt")}
										required
										@input=${syncInsert}
									></dj-text-input>
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

/** The image plugin with the default (data-URL) uploader. */
export const imagePlugin = createImagePlugin();

export default imagePlugin;
