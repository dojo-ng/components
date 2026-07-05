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

export interface ImagePayload {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	key?: NodeKey;
}

export type SerializedImageNode = Spread<
	{ src: string; alt: string; width?: number; height?: number },
	SerializedLexicalNode
>;

/**
 * A decorator node for an inline image. `createDOM` returns the `<span>` container that lives in the
 * Lexical tree; `decorate()` returns the `<img>` the plugin's decorator listener mounts inside that
 * container. `exportDOM`/`importDOM` speak plain `<img src alt [width] [height]>`; JSON is versioned.
 */
export class ImageNode extends DecoratorNode<HTMLElement> {
	__src: string;
	__alt: string;
	__width?: number;
	__height?: number;
	#img?: HTMLImageElement;

	static override getType(): string {
		return "dj-image";
	}

	static override clone(node: ImageNode): ImageNode {
		return new ImageNode({
			src: node.__src,
			alt: node.__alt,
			width: node.__width,
			height: node.__height,
			key: node.__key,
		});
	}

	static override importJSON(serialized: SerializedImageNode): ImageNode {
		const { src, alt, width, height } = serialized;
		return $createImageNode({ src, alt, width, height });
	}

	static override importDOM(): DOMConversionMap | null {
		return {
			img: () => ({ conversion: convertImgElement, priority: 0 }),
		};
	}

	constructor(payload: ImagePayload) {
		super(payload.key);
		this.__src = payload.src;
		this.__alt = payload.alt;
		this.__width = payload.width;
		this.__height = payload.height;
	}

	override exportJSON(): SerializedImageNode {
		// Note: `DecoratorNode` does not implement `exportJSON` (the base `LexicalNode.exportJSON`
		// throws "base method not extended"), so we build the object directly rather than spreading
		// `super.exportJSON()`.
		return {
			type: "dj-image",
			version: 1,
			src: this.__src,
			alt: this.__alt,
			width: this.__width,
			height: this.__height,
		};
	}

	override createDOM(_config: EditorConfig): HTMLElement {
		const span = document.createElement("span");
		span.className = "dj-rt-image";
		return span;
	}

	override updateDOM(): boolean {
		return false;
	}

	override exportDOM(): DOMExportOutput {
		const img = document.createElement("img");
		img.setAttribute("src", this.__src);
		img.setAttribute("alt", this.__alt);
		if (this.__width != null) img.setAttribute("width", String(this.__width));
		if (this.__height != null) img.setAttribute("height", String(this.__height));
		return { element: img };
	}

	/** The `<img>` element, created once per node instance and patched on update. */
	override decorate(editor: LexicalEditor): HTMLElement {
		const key = this.getKey();
		if (!this.#img) {
			const img = document.createElement("img");
			img.addEventListener("click", (e) => {
				e.preventDefault();
				editor.update(() => {
					// Click selects the image as a NodeSelection; Backspace/Delete is then handled by
					// Lexical natively. The node key is stable across clones, so capturing it is safe.
					const sel = $createNodeSelection();
					sel.add(key);
					$setSelection(sel);
				});
			});
			this.#img = img;
		}
		const img = this.#img;
		img.setAttribute("src", this.__src);
		img.setAttribute("alt", this.__alt);
		if (this.__width != null) img.setAttribute("width", String(this.__width));
		else img.removeAttribute("width");
		if (this.__height != null) img.setAttribute("height", String(this.__height));
		else img.removeAttribute("height");
		return img;
	}

	getSrc(): string {
		return this.__src;
	}
	getAlt(): string {
		return this.__alt;
	}
}

function convertImgElement(el: HTMLElement): DOMConversionOutput {
	const img = el as HTMLImageElement;
	const src = img.getAttribute("src") ?? "";
	const alt = img.getAttribute("alt") ?? ""; // a missing alt becomes ""
	const width = img.hasAttribute("width") ? Number(img.getAttribute("width")) : undefined;
	const height = img.hasAttribute("height") ? Number(img.getAttribute("height")) : undefined;
	return { node: $createImageNode({ src, alt, width, height }) };
}

/** Create an image node. */
export function $createImageNode(payload: ImagePayload): ImageNode {
	return $applyNodeReplacement(new ImageNode(payload));
}

/** Type guard for `ImageNode`. */
export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
	return node instanceof ImageNode;
}
