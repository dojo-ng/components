import {
	$applyNodeReplacement,
	$createNodeSelection,
	$setSelection,
	DecoratorNode,
	type DOMConversionMap,
	type DOMConversionOutput,
	type DOMExportOutput,
	type EditorConfig,
	type LexicalEditor,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
} from "lexical";
import "@dojo-ng/video";
import "@dojo-ng/audio";
import { embedHref, type EmbedPayload } from "./matchers.js";

export interface EmbedNodePayload extends EmbedPayload {
	key?: NodeKey;
}

export type SerializedEmbedNode = Spread<
	{ kind: string; src: string; title?: string },
	SerializedLexicalNode
>;

/**
 * A decorator node for a media embed (YouTube/Vimeo iframe, or a direct video/audio file rendered by
 * `dj-video`/`dj-audio`). `createDOM` returns the `<span class="dj-rt-embed" data-kind>` container in
 * the Lexical tree; `decorate()` returns the inner element the plugin's decorator listener mounts
 * inside it. `exportDOM`/`importDOM` speak `<div data-dj-embed data-src [data-title]>` wrapping a
 * fallback `<a href>`; JSON is versioned. Modelled on the image node.
 */
export class EmbedNode extends DecoratorNode<HTMLElement> {
	__kind: string;
	__src: string;
	__title?: string;
	#el?: HTMLElement;

	static override getType(): string {
		return "dj-embed";
	}

	static override clone(node: EmbedNode): EmbedNode {
		return new EmbedNode({ kind: node.__kind, src: node.__src, title: node.__title, key: node.__key });
	}

	static override importJSON(serialized: SerializedEmbedNode): EmbedNode {
		const { kind, src, title } = serialized;
		return $createEmbedNode({ kind, src, title });
	}

	static override importDOM(): DOMConversionMap | null {
		return {
			div: (node: HTMLElement) =>
				node.hasAttribute("data-dj-embed") ? { conversion: convertEmbedDiv, priority: 1 } : null,
		};
	}

	constructor(payload: EmbedNodePayload) {
		super(payload.key);
		this.__kind = payload.kind;
		this.__src = payload.src;
		this.__title = payload.title;
	}

	override exportJSON(): SerializedEmbedNode {
		// DecoratorNode does not implement exportJSON (base throws), so build the object directly.
		return {
			type: "dj-embed",
			version: 1,
			kind: this.__kind,
			src: this.__src,
			title: this.__title,
		};
	}

	override createDOM(_config: EditorConfig): HTMLElement {
		const span = document.createElement("span");
		span.className = "dj-rt-embed";
		span.setAttribute("data-kind", this.__kind);
		return span;
	}

	override updateDOM(): boolean {
		return false;
	}

	override exportDOM(): DOMExportOutput {
		const div = document.createElement("div");
		div.setAttribute("data-dj-embed", this.__kind);
		div.setAttribute("data-src", this.__src);
		if (this.__title) div.setAttribute("data-title", this.__title);
		const a = document.createElement("a");
		const href = embedHref({ kind: this.__kind, src: this.__src, title: this.__title });
		a.setAttribute("href", href);
		a.textContent = this.__title || href;
		div.appendChild(a);
		return { element: div };
	}

	/** The inner element, created once per node instance; click selects the node (NodeSelection). */
	override decorate(editor: LexicalEditor): HTMLElement {
		const key = this.getKey();
		if (!this.#el) {
			const el = this.#buildInner();
			el.addEventListener("click", (e) => {
				e.preventDefault();
				editor.update(() => {
					const sel = $createNodeSelection();
					sel.add(key);
					$setSelection(sel);
				});
			});
			this.#el = el;
		}
		return this.#el;
	}

	#buildInner(): HTMLElement {
		const { __kind: kind, __src: src, __title: title } = this;
		if (kind === "video") {
			const v = document.createElement("dj-video") as HTMLElement & { src: string; label?: string };
			v.src = src;
			if (title) v.label = title;
			return v;
		}
		if (kind === "audio") {
			const a = document.createElement("dj-audio") as HTMLElement & { src: string; label?: string };
			a.src = src;
			if (title) a.label = title;
			return a;
		}
		if (kind === "youtube" || kind === "vimeo") {
			const iframe = document.createElement("iframe");
			iframe.src =
				kind === "youtube"
					? `https://www.youtube-nocookie.com/embed/${src}`
					: `https://player.vimeo.com/video/${src}`;
			if (title) iframe.title = title;
			iframe.setAttribute("allowfullscreen", "");
			iframe.setAttribute("loading", "lazy");
			iframe.setAttribute("allow", "encrypted-media; picture-in-picture");
			return iframe;
		}
		// Unknown kind (a custom matcher with no renderer): the working link.
		const a = document.createElement("a");
		a.href = embedHref({ kind, src, title });
		a.textContent = title || src;
		return a;
	}

	getKindValue(): string {
		return this.__kind;
	}
	getSrc(): string {
		return this.__src;
	}
	getTitle(): string | undefined {
		return this.__title;
	}
}

function convertEmbedDiv(el: HTMLElement): DOMConversionOutput {
	const kind = el.getAttribute("data-dj-embed") ?? "";
	const src = el.getAttribute("data-src") ?? "";
	const title = el.getAttribute("data-title") ?? undefined;
	return { node: $createEmbedNode({ kind, src, title }) };
}

/** Create an embed node. */
export function $createEmbedNode(payload: EmbedNodePayload): EmbedNode {
	return $applyNodeReplacement(new EmbedNode(payload));
}

/** Type guard for `EmbedNode`. */
export function $isEmbedNode(node: LexicalNode | null | undefined): node is EmbedNode {
	return node instanceof EmbedNode;
}
