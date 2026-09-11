import { html, nothing } from "lit";
import type { CSSResultGroup } from "lit";
import { property, state, query } from "lit/decorators.js";
import DojoElement, { dismissOnFocusOut } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/chip";
import "@dojo-ng/popup";
import "@dojo-ng/list";
import type { ListOption, DjList } from "@dojo-ng/list";
import type { PopupPosition } from "@dojo-ng/popup";
import styles from "./dj-search-box.styles.js";
import { parseQuery } from "./query.js";
import type { SearchKey, SearchQuery, SearchToken } from "./query.js";

const EN: Record<string, string> = {
	clearSearch: "Clear search",
	removeFilter: "Remove {filter}",
	suggestions: "Suggestions",
};
registerDefaults("dj", EN);

const CLEAR_ICON = html`<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

// The trailing `key:value` being typed. The key has no space/colon/quote; the value is either a
// (possibly unterminated) double-quoted run or a run of non-space characters.
const TOKEN_TAIL = /(^|\s)([^\s:"]+):("(?:[^"]*)"?|[^\s]*)$/;

/**
 * `<dj-search-box>` — a search field: free text plus typed `key:value` filters. Typing a configured
 * `key:` enters token mode; keys with `options` open a suggestion popup (pick to commit), keys
 * without take a free-typed value committed by Enter or the terminating space (values may be
 * `"quoted"` to hold spaces). A committed filter becomes a closeable `<dj-chip>` before the input;
 * an unconfigured `word:` stays plain text. Backspace with the caret at the start removes the last
 * chip. Read-only `query` = `{ text, tokens }`; set it with `setQuery`. Not form-associated.
 *
 * Parts: `box`, `input`, `chip`, `clear`, `label`. (No slots — content comes from `keys`/`query`.)
 * Events: `dj-query-change` (`{ query }`) on any token or committed-text change;
 * `dj-search` (`{ query }`) on Enter outside token mode.
 *
 * @cssprop [--dj-focus-ring] - Focus ring for the clear button (inherited token).
 */
export class DjSearchBox extends DojoElement {
	static override styles: CSSResultGroup = styles;
	static override version = "0.1.1";
	static override focusable = true;

	#i18n = new LocaleController(this);
	@query(".input") private input!: HTMLInputElement;

	/** Configured filter keys. Keys with `options` get value suggestions; keys without take free text. */
	@property({ type: Array }) keys: SearchKey[] = [];
	@property() label?: string;
	@property() placeholder?: string;
	@property({ reflect: true }) position: PopupPosition = "below";
	@property({ type: Boolean, reflect: true }) disabled = false;

	@state() private tokens: SearchToken[] = [];
	@state() private text = "";
	@state() private open = false;
	@state() private focused = false;

	/** The current structured query (read-only): free text plus the committed filter tokens. */
	get query(): SearchQuery {
		const tail = this.#tail();
		const inToken = !!(tail && this.#configured.has(tail.key));
		const text = (inToken ? this.text.slice(0, tail.start) : this.text).trim();
		return { text, tokens: this.tokens.map((t) => ({ ...t })) };
	}

	/** Set the query programmatically, rendering its chips and text. Does not emit. */
	setQuery(q: SearchQuery) {
		this.tokens = q.tokens ? q.tokens.map((t) => ({ ...t })) : [];
		this.text = q.text ?? "";
		if (this.input) this.input.value = this.text;
		this.open = false;
	}

	/** Clear all text and filters, emitting `dj-query-change`. */
	clear() {
		this.tokens = [];
		this.text = "";
		if (this.input) this.input.value = "";
		this.open = false;
		this.#emitQueryChange();
		this.input?.focus();
	}

	override focus(options?: FocusOptions) { this.input?.focus(options); }

	#disposeFocusOut?: () => void;
	override connectedCallback() { super.connectedCallback(); this.#disposeFocusOut = dismissOnFocusOut(this, () => { this.open = false; }); }
	override disconnectedCallback() { super.disconnectedCallback(); this.#disposeFocusOut?.(); }

	get #configured(): Set<string> { return new Set(this.keys.map((k) => k.key)); }

	/** Parse the trailing in-progress token from `this.text`, if any. */
	#tail(): { start: number; key: string; value: string; openQuote: boolean } | null {
		const m = TOKEN_TAIL.exec(this.text);
		if (!m) return null;
		const start = m.index + m[1].length;
		const raw = m[3];
		const quoted = raw.startsWith('"');
		const closed = quoted && raw.length > 1 && raw.endsWith('"');
		const value = quoted ? raw.slice(1, closed ? -1 : undefined) : raw;
		return { start, key: m[2], value, openQuote: quoted && !closed };
	}

	/** The configured key for the trailing token, if the tail names one. */
	#activeKey(): SearchKey | undefined {
		const tail = this.#tail();
		return tail ? this.keys.find((k) => k.key === tail.key) : undefined;
	}

	/** Suggestions for the active options-key, filtered by the value typed so far. */
	get #suggestions(): ListOption[] {
		const key = this.#activeKey();
		if (!key?.options?.length) return [];
		const q = (this.#tail()?.value ?? "").trim().toLowerCase();
		return q ? key.options.filter((o) => (o.label ?? o.value).toLowerCase().includes(q)) : key.options;
	}

	#keyLabel(k: string): string { return this.keys.find((x) => x.key === k)?.label ?? k; }
	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? format(EN[key] ?? key, params);
	}

	#emitQueryChange() { this.emit("dj-query-change", { detail: { query: this.query } }); }

	#removeToken(i: number) {
		this.tokens = this.tokens.filter((_, j) => j !== i);
		this.#emitQueryChange();
	}

	/** Commit the trailing free-typed token (no-options keys), reusing the shared grammar. */
	#commitActive() {
		const tail = this.#tail();
		if (!tail) return;
		let seg = this.text.slice(tail.start);
		if (tail.openQuote) seg += '"'; // close the quote so parseQuery reads the value
		const tok = parseQuery(seg, this.keys).tokens[0];
		if (!tok) return;
		this.tokens = [...this.tokens, tok];
		this.text = this.text.slice(0, tail.start); // keep any preceding free text + separator
		if (this.input) this.input.value = this.text;
		this.open = false;
		this.#emitQueryChange();
	}

	private onInput(e: Event) {
		this.text = (e.target as HTMLInputElement).value;
		const key = this.#activeKey();
		this.open = !!key?.options?.length && this.#suggestions.length > 0;
		// A change to the free text (not an in-progress token) is a committed-text change.
		if (!key) this.#emitQueryChange();
	}

	private onKey(e: KeyboardEvent) {
		const key = this.#activeKey();
		if (e.key === "Enter") {
			if (this.open) {
				e.preventDefault();
				this.renderRoot.querySelector<DjList>("dj-list")?.chooseActive(); // onSelect commits
				return;
			}
			const tail = this.#tail();
			if (key && !key.options?.length && tail && tail.value !== "") {
				e.preventDefault();
				this.#commitActive();
				return;
			}
			e.preventDefault();
			this.emit("dj-search", { detail: { query: this.query } });
			return;
		}
		if (e.key === " ") {
			const tail = this.#tail();
			if (key && !key.options?.length && tail && tail.value !== "" && !tail.openQuote) {
				e.preventDefault();
				this.#commitActive();
			}
			return;
		}
		if (e.key === "Backspace") {
			if (this.input.selectionStart === 0 && this.input.selectionEnd === 0 && this.tokens.length) {
				e.preventDefault();
				this.#removeToken(this.tokens.length - 1);
			}
			return;
		}
		if (e.key === "ArrowDown") {
			if (this.#suggestions.length) {
				e.preventDefault();
				this.open = true;
				void this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement & { focus(): void }>("dj-list")?.focus());
			}
			return;
		}
		if (e.key === "Escape") { this.open = false; }
	}

	private onSelect(e: Event) {
		e.stopPropagation();
		const value = (e.target as HTMLElement & { value: string }).value;
		const key = this.#activeKey();
		const tail = this.#tail();
		if (key && tail) {
			this.tokens = [...this.tokens, { key: key.key, value }];
			this.text = this.text.slice(0, tail.start);
			if (this.input) this.input.value = this.text;
			this.#emitQueryChange();
		}
		this.open = false;
		this.input?.focus();
	}

	override render() {
		const nonEmpty = this.tokens.length > 0 || this.text.length > 0;
		const clearLabel = this.#msg("clearSearch");
		// Stable root wrapper: a leading `${cond ? … : nothing}` as the first node desyncs Lit's
		// parts under happy-dom (bindings land on the wrong node) — the same guard file-input uses.
		return html`
			<div class="field">
				${this.label ? html`<span part="label" class="label">${this.label}</span>` : nothing}
				<div part="box" class="box ${this.focused ? "box--focused" : ""}" @click=${() => this.input?.focus()}>
					${this.tokens.map((t, i) => {
						const filter = `${this.#keyLabel(t.key)}: ${t.value}`;
						return html`<dj-chip part="chip" closeable close-label=${this.#msg("removeFilter", { filter })} @dj-close=${() => this.#removeToken(i)}>${filter}</dj-chip>`;
					})}
					<!--
						The text services must keep their hands off this field. It holds a
						grammar, not prose: \`from:alice\` is parsed by \`key\`, and \`configured\`
						is a case-sensitive Set, so a platform that helpfully capitalises the
						word before a colon turns \`from:\` into \`From:\`, which stops being a
						token and silently becomes free text — filter gone, no error, and the
						search quietly returns the wrong thing.
						Not hypothetical: it is exactly what macOS automatic capitalisation
						does inside a WKWebView, where these attributes are the only defence.
						Safari's defaults happen to hide it, which is what makes it worth
						stating explicitly rather than trusting the platform to stay quiet.
					-->
					<input class="input" part="input" .value=${this.text}
						autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"
						placeholder=${this.tokens.length ? nothing : (this.placeholder ?? nothing)}
						?disabled=${this.disabled}
						role="combobox" aria-label=${this.label ?? nothing} aria-expanded=${this.open ? "true" : "false"}
						aria-controls="suggestions"
						@input=${this.onInput} @keydown=${this.onKey}
						@focus=${() => { this.focused = true; }}
						@blur=${() => { this.focused = false; }} />
					${nonEmpty
						? html`<button part="clear" class="clear" type="button" aria-label=${clearLabel} title=${clearLabel} ?disabled=${this.disabled} @click=${() => this.clear()}>${CLEAR_ICON}</button>`
						: nothing}
				</div>
				<dj-popup .anchor=${this.input} .open=${this.open && this.#suggestions.length > 0} position=${this.position} .scrollLock=${false} @dj-close=${() => { this.open = false; }}>
					<dj-list id="suggestions" label=${this.#msg("suggestions")} .options=${this.#suggestions} @change=${(e: Event) => this.onSelect(e)}></dj-list>
				</dj-popup>
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
		"dj-query-change": CustomEvent<{ query: SearchQuery }>;
		"dj-search": CustomEvent<{ query: SearchQuery }>;
	}
}

export default DjSearchBox;
