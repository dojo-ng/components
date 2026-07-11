import { html, nothing } from "lit";
import type { CSSResultGroup } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { DojoFormControl, FormControl } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/button";
import "@dojo-ng/icon";
import styles from "./dj-file-input.styles.js";
import { matchesAccept } from "./accept.js";

const EN: Record<string, string> = {
	chooseFile: "Choose file",
	chooseFiles: "Choose files",
	dropHint: "or drop files here",
	dropzone: "Drop or paste files here",
	removeFile: "Remove {name}",
	fileTooLarge: "{name} exceeds the maximum size",
};
registerDefaults("dj", EN);

const CLOSE_ICON = html`<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

/**
 * `<dj-file-input>` — a form-associated file selector with a button (opens the OS picker) and a
 * focusable drop zone. Files arrive by picker, drop, paste (a screenshot pasted while the drop zone
 * has focus), or the public `addFiles` method; all four route through one intake that applies
 * `accept` + `multiple` + max-size. Selected files are copied into component state, shown as a
 * removable list; the element only SELECTS files (no upload/preview). Form value: a single `File`
 * normally, or a `FormData` with one entry per file (under `name`) when `multiple`. Parts: `button`,
 * `dropzone`, `list`, `item`, `remove`. Event: `dj-change` (`{ files }`) on add and remove.
 */
export class DjFileInput extends FormControl(DojoElement) implements Partial<DojoFormControl> {
	static override styles: CSSResultGroup = styles;
	static override version = "0.1.0";
	static override focusable = true;
	static formAssociated = true;

	#internals: ElementInternals;
	#i18n = new LocaleController(this);
	@query(".native") private native!: HTMLInputElement;
	@state() private items: File[] = [];
	@state() private dragging = false;

	@property() accept?: string;
	@property({ type: Boolean }) multiple = false;
	@property({ type: Boolean, reflect: true }) required = false;
	@property({ attribute: "max-size", type: Number }) maxSize?: number;
	@property() label?: string;
	@property({ reflect: true }) name?: string;
	@property({ type: Boolean, reflect: true }) disabled = false;

	constructor() {
		super();
		this.#internals = this.attachInternals();
		this.addEventListener("paste", this.#onPaste);
	}

	/** The currently selected files (read-only). */
	get files(): File[] { return this.items; }

	get validity(): ValidityState { return this.#internals.validity; }
	get validationMessage(): string { return this.#internals.validationMessage; }
	checkValidity(): boolean { return this.#internals.checkValidity(); }
	reportValidity(): boolean { return this.#internals.reportValidity(); }

	override focus(options?: FocusOptions) {
		// Focus the dropzone: it is the drop/paste surface, so a keyboard user landing here can paste.
		this.shadowRoot?.querySelector<HTMLElement>("[part=dropzone]")?.focus(options);
	}

	/** Remove all selected files (no `dj-change`). */
	clear() {
		this.items = [];
		this.#sync();
	}

	formResetCallback() { this.items = []; this.#sync(); }

	protected override firstUpdated() { this.#sync(); }

	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? format(EN[key] ?? key, params);
	}

	#sync(sizeErrorFor?: string) {
		// Form value: single File, or a FormData of entries under `name`. Skip entirely with no name.
		if (this.name) {
			if (this.multiple) {
				const fd = new FormData();
				for (const f of this.items) fd.append(this.name, f);
				this.#internals.setFormValue(fd);
			} else {
				this.#internals.setFormValue(this.items[0] ?? null);
			}
		} else {
			this.#internals.setFormValue(null);
		}
		// Validity: oversize (customError) takes priority, then required-but-empty.
		const anchor = this.native ?? undefined;
		if (sizeErrorFor != null) {
			this.#internals.setValidity({ customError: true }, this.#msg("fileTooLarge", { name: sizeErrorFor }), anchor);
		} else if (this.required && this.items.length === 0) {
			this.#internals.setValidity({ valueMissing: true }, this.#msg("chooseFile"), anchor);
		} else {
			this.#internals.setValidity({});
		}
	}

	/**
	 * Add files from any source, applying `accept` + `multiple` + `max-size`; appends, or replaces when
	 * not `multiple`. Emits `dj-change`. This is the single intake path — the picker, drop, and paste all
	 * route through it, and the app can call it to forward files captured elsewhere (e.g. a paste into the
	 * compose body or a drop on the whole pane).
	 */
	addFiles(incoming: File[] | FileList) {
		const accepted = Array.from(incoming).filter((f) => matchesAccept(f, this.accept));
		const candidates = this.multiple ? accepted : accepted.slice(0, 1);
		let sizeError: string | undefined;
		const withinSize = candidates.filter((f) => {
			if (this.maxSize != null && f.size > this.maxSize) {
				sizeError = f.name; // last offender wins the message
				return false;
			}
			return true;
		});
		if (this.multiple) this.items = [...this.items, ...withinSize];
		else this.items = withinSize.length ? [withinSize[0]] : this.items;
		this.#sync(sizeError);
		this.emit("dj-change", { detail: { files: this.items } });
	}

	#remove(index: number) {
		this.items = this.items.filter((_, i) => i !== index);
		this.#sync();
		this.emit("dj-change", { detail: { files: this.items } });
	}

	#openPicker = () => { if (!this.isDisabled) this.native.click(); };
	#onNativeChange = (e: Event) => {
		const input = e.target as HTMLInputElement;
		this.addFiles(input.files ?? []);
		input.value = ""; // allow re-selecting the same file
	};
	#onDragOver = (e: DragEvent) => { if (this.isDisabled) return; e.preventDefault(); this.dragging = true; };
	#onDragLeave = () => { this.dragging = false; };
	#onDrop = (e: DragEvent) => {
		if (this.isDisabled) return;
		e.preventDefault();
		this.dragging = false;
		this.addFiles(e.dataTransfer?.files ?? []);
	};
	// Paste of a file (e.g. a screenshot) while the control has focus routes through the same intake.
	#onPaste = (e: ClipboardEvent) => {
		if (this.isDisabled || !this.#hasFocus()) return;
		const files = e.clipboardData?.files;
		if (files && files.length) {
			e.preventDefault();
			this.addFiles(files);
		}
	};

	/** Whether focus is inside the control (the delegated button, or the host itself). */
	#hasFocus(): boolean {
		return this.shadowRoot?.activeElement != null || (this.getRootNode() as Document | ShadowRoot).activeElement === this;
	}

	#formatSize(bytes: number): string {
		const locale = this.#i18n.locale;
		try {
			if (bytes >= 1_000_000) {
				return new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }).format(bytes / 1_000_000);
			}
			return new Intl.NumberFormat(locale, { style: "unit", unit: "kilobyte", maximumFractionDigits: 1 }).format(bytes / 1000);
		} catch {
			return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${(bytes / 1000).toFixed(1)} kB`;
		}
	}

	override render() {
		const disabled = this.isDisabled;
		const chooseLabel = this.multiple ? this.#msg("chooseFiles") : this.#msg("chooseFile");
		// A stable root wrapper is required: a leading `${cond ? … : nothing}` as the first template
		// node desyncs Lit's parts under happy-dom (event bindings silently land on the wrong node).
		return html`
			<div class="field">
			${this.label ? html`<span class="label" part="label">${this.label}</span>` : nothing}
			<div
				class="dropzone ${this.dragging ? "is-drag" : ""}"
				part="dropzone"
				role="group"
				aria-label=${this.#msg("dropzone")}
				tabindex=${disabled ? -1 : 0}
				@dragover=${this.#onDragOver}
				@dragleave=${this.#onDragLeave}
				@drop=${this.#onDrop}
			>
				<dj-button part="button" ?disabled=${disabled} @click=${this.#openPicker}>${chooseLabel}</dj-button>
				<span class="hint">${this.#msg("dropHint")}</span>
				<input
					class="native"
					type="file"
					accept=${this.accept ?? nothing}
					?multiple=${this.multiple}
					?disabled=${disabled}
					@change=${this.#onNativeChange}
					aria-hidden="true"
					tabindex="-1"
				/>
			</div>
			${this.items.length
				? html`<ul class="list" part="list">
						${this.items.map((f, i) => {
							const removeLabel = this.#msg("removeFile", { name: f.name });
							return html`<li class="item" part="item">
								<span class="name">${f.name}</span>
								<span class="size">${this.#formatSize(f.size)}</span>
								<dj-button
									part="remove"
									class="remove"
									kind="text"
									title=${removeLabel}
									?disabled=${disabled}
									@click=${() => this.#remove(i)}
								>
									<dj-icon slot="icon" alt-text=${removeLabel}>${CLOSE_ICON}</dj-icon>
								</dj-button>
							</li>`;
						})}
					</ul>`
				: nothing}
			</div>
		`;
	}
}

/** Minimal `{placeholder}` interpolation for the EN fallback path (mirrors i18n's format). */
function format(template: string, params?: Record<string, string | number>): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

declare global {
	interface GlobalEventHandlersEventMap {
		"dj-change": CustomEvent<{ files: File[] }>;
	}
}

export default DjFileInput;
