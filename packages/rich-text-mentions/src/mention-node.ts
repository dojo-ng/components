import {
	$applyNodeReplacement,
	TextNode,
	type DOMConversionMap,
	type DOMConversionOutput,
	type DOMExportOutput,
	type EditorConfig,
	type LexicalNode,
	type NodeKey,
	type SerializedTextNode,
	type Spread,
} from "lexical";

export type SerializedMentionNode = Spread<{ id: string }, SerializedTextNode>;

/**
 * An inline mention token, e.g. `@Jeff`. A `TextNode` subclass in `segmented` mode, so it deletes and
 * moves as one unit and can't be edited from the inside. Carries the mentioned entity's `id`; renders
 * as a `<span class="dj-rt-mention" data-dj-mention="{id}">`, exports/imports the same shape so it
 * survives the `value` round-trip. (TextNode overrides `exportJSON`, so spreading `super.exportJSON()`
 * is safe here — unlike DecoratorNode subclasses.)
 */
export class MentionNode extends TextNode {
	__id: string;

	static override getType(): string { return "dj-mention"; }

	static override clone(node: MentionNode): MentionNode {
		return new MentionNode(node.__id, node.__text, node.__key);
	}

	constructor(id: string, text: string, key?: NodeKey) {
		super(text, key);
		this.__id = id;
	}

	/** The mentioned entity's id. */
	getId(): string { return this.getLatest().__id; }

	override createDOM(config: EditorConfig): HTMLElement {
		const dom = super.createDOM(config);
		dom.classList.add("dj-rt-mention");
		dom.setAttribute("data-dj-mention", this.__id);
		return dom;
	}

	override exportDOM(): DOMExportOutput {
		const element = document.createElement("span");
		element.setAttribute("data-dj-mention", this.__id);
		element.textContent = this.getTextContent();
		return { element };
	}

	static override importDOM(): DOMConversionMap | null {
		return {
			span: (domNode: HTMLElement) => {
				if (!domNode.hasAttribute("data-dj-mention")) return null;
				return { conversion: convertMentionElement, priority: 1 };
			},
		};
	}

	override exportJSON(): SerializedMentionNode {
		return {
			...super.exportJSON(),
			id: this.__id,
			type: "dj-mention",
			version: 1,
		};
	}

	static override importJSON(serializedNode: SerializedMentionNode): MentionNode {
		const label = (serializedNode.text ?? "").replace(/^@/, "");
		const node = $createMentionNode(serializedNode.id, label);
		node.setFormat(serializedNode.format);
		node.setDetail(serializedNode.detail);
		node.setStyle(serializedNode.style);
		return node;
	}

	/** A mention is atomic: prevent inline editing/merging so it deletes as a unit. */
	override canInsertTextBefore(): boolean { return false; }
	override canInsertTextAfter(): boolean { return false; }
	override isTextEntity(): boolean { return true; }
}

function convertMentionElement(domNode: HTMLElement): DOMConversionOutput {
	const id = domNode.getAttribute("data-dj-mention") ?? "";
	const label = (domNode.textContent ?? "").replace(/^@/, "");
	return { node: $createMentionNode(id, label) };
}

/** Create a mention node from an id and a display label; renders as `@label`, deletes as a unit. */
export function $createMentionNode(id: string, label: string): MentionNode {
	const node = new MentionNode(id, "@" + label);
	node.setMode("segmented");
	return $applyNodeReplacement(node);
}

export function $isMentionNode(node: LexicalNode | null | undefined): node is MentionNode {
	return node instanceof MentionNode;
}
