import { css, html, nothing } from "lit";
import { property, query, state } from "lit/decorators.js";
import DojoElement, { deepActiveElement } from "@dojo-ng/dojo-element";
import { LocaleController, messages, registerDefaults } from "@dojo-ng/i18n";
import { commands, formatShortcut } from "@dojo-ng/commands";
import type { Command, CommandRegistry } from "@dojo-ng/commands";
import type { DjList, ListOption } from "@dojo-ng/list";
import "@dojo-ng/dialog";
import "@dojo-ng/list";
import { filterCommands } from "./match.js";

registerDefaults("dj", {
	commandPalette: "Command palette",
	commandSearch: "Type a command",
	commandNone: "No matching commands",
	commandRecent: "Recent",
	commandOpen: "Open command palette",
	commandsGroup: "Commands",
	commandHelpTitle: "Keyboard shortcuts",
	commandHelpHint: "Press ? for shortcuts",
	commandPosition: "{label}, {pos} of {count}",
});

const OPEN_ID = "dj-command-palette.open";
const RECENT_MAX = 5;

/**
 * `<dj-command-palette>` — search and run the actions in a `@dojo-ng/commands` registry.
 *
 * Put one on the page. It opens with `shortcut` (Mod+K by default; Cmd+K on a Mac, Ctrl+K
 * elsewhere), or with `show()`. Type to narrow the list, use the arrow keys and Enter to run a
 * command, and Escape to close; focus goes back to where it was.
 *
 * #### What it lists
 * - The commands that apply now: those whose `when` is not false, and those registered on a
 *   scope that holds the focus the palette opened from, plus global ones.
 * - With nothing typed, recently run commands come first, then the rest under their `group`
 *   headings. Recent commands are kept in memory only.
 * - Every word typed must appear in a command's group, label, or keywords, in any order. A label
 *   that starts with the first word ranks first.
 * - Each command's shortcut is shown at the end of its row.
 *
 * #### Shortcut help
 * - Press `?` with nothing typed, or call `showHelp()`, to list every active shortcut by group.
 *   The list follows the focus the palette opened from, so a grid's keys show while the grid has focus.
 *
 * #### Accessibility
 * - The text input is a combobox that keeps focus. The highlighted command is read from a live
 *   region ("Save document, 2 of 7"), because the list's rows are in another shadow root.
 *
 * Parts: `dialog`, `input`, `list`.
 *
 * @fires dj-command-run - A command was run from the palette. `detail: { id }`.
 * @fires dj-close - The palette closed, by Escape, a click outside, a run, or `hide()`. Does not bubble. Listen for it to put back state that focus alone does not, such as an editor's selection.
 */
export class DjCommandPalette extends DojoElement {
	static override version = "0.1.0";

	static override styles = css`
		:host { display: contents; }
		dj-dialog::part(dialog) { top: 12vh; transform: translate(-50%, 0); width: min(92vw, 38rem); max-width: none; }
		dj-dialog::part(title), dj-dialog::part(actions) { display: none; }
		dj-dialog::part(content) { padding: var(--dj-spacing-small, 0.75rem); }
		.body { display: flex; flex-direction: column; gap: var(--dj-spacing-x-small, 0.5rem); }
		input { font: inherit; box-sizing: border-box; width: 100%; padding: var(--dj-spacing-small, 0.75rem);
			color: inherit; background: var(--dj-color-background, #fff);
			border: 1px solid var(--dj-color-border, #d1d5db); border-radius: var(--dj-input-border-radius-medium, 0.25rem); }
		input:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: 1px; }
		.title { font-weight: var(--dj-font-weight-semibold, 600); padding-inline: var(--dj-spacing-2x-small, 0.25rem); }
		dj-list { --dj-list-max-height: min(24rem, 55vh); }
		dj-list::part(list) { border: none; }
		.empty { padding: var(--dj-spacing-small, 0.75rem); opacity: 0.7; }
		.sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
	`;

	/** Whether the palette is showing. */
	@property({ type: Boolean, reflect: true }) open = false;
	/** The key that opens it, in the form `@dojo-ng/commands` reads. `Mod` is Cmd on a Mac and Ctrl elsewhere. */
	@property() shortcut = "Mod+K";
	/** Accessible name of the dialog and the input. */
	@property() label?: string;
	@property() placeholder?: string;
	/** The registry to read. Defaults to the app-wide `commands`. */
	@property({ attribute: false }) registry: CommandRegistry = commands;

	@state() private query = "";
	@state() private help = false;
	@state() private announcement = "";

	@query("input") private input?: HTMLInputElement;
	@query("dj-list") private list?: DjList;

	#i18n = new LocaleController(this);
	#from: Element | null = null;
	#recent: string[] = [];
	#registered?: { registry: CommandRegistry; shortcut: string; off: () => void };
	#offChange?: () => void;
	#ids: string[] = [];

	#msg(key: string, params?: Record<string, string | number>): string {
		return messages.resolve("dj", this.#i18n.locale, key, params) ?? key;
	}

	/** Open the palette, listing the commands that apply where focus is now. */
	show(): void {
		if (this.open) return;
		this.#from = deepActiveElement();
		this.query = "";
		this.help = false;
		this.open = true;
	}

	hide(): void {
		this.open = false;
	}

	toggle(): void {
		if (this.open) this.hide();
		else this.show();
	}

	/** Open the palette on its list of active shortcuts. */
	showHelp(): void {
		if (!this.open) this.show();
		this.query = "";
		this.help = true;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.#bind();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.#registered?.off();
		this.#registered = undefined;
		this.#offChange?.();
		this.#offChange = undefined;
		this.open = false;
	}

	#bind(): void {
		const reg = this.#registered;
		if (reg && reg.registry === this.registry && reg.shortcut === this.shortcut) return;
		reg?.off();
		this.#offChange?.();
		const registry = this.registry;
		const off = registry.register({
			id: OPEN_ID,
			label: this.#msg("commandOpen"),
			group: this.#msg("commandsGroup"),
			shortcut: this.shortcut,
			allowInText: true,
			run: () => this.toggle(),
		});
		this.#registered = { registry, shortcut: this.shortcut, off };
		this.#offChange = registry.onChange(() => { if (this.open) this.requestUpdate(); });
	}

	protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
		super.willUpdate(changed);
		if (this.isConnected && (changed.has("registry") || changed.has("shortcut"))) this.#bind();
	}

	protected override updated(changed: Map<PropertyKey, unknown>): void {
		super.updated(changed);
		if (changed.has("open") && changed.get("open") === true && !this.open) this.emit("dj-close", { bubbles: false, composed: false });
		if (changed.has("open") && this.open) void this.#focusInput();
		if (this.open && (changed.has("query") || changed.has("help") || changed.has("open"))) void this.#highlightFirst();
	}

	async #focusInput(): Promise<void> {
		await this.updateComplete;
		await this.renderRoot.querySelector("dj-dialog")?.updateComplete;
		this.input?.focus();
	}

	async #highlightFirst(): Promise<void> {
		await this.updateComplete;
		const list = this.list;
		if (!list) return;
		await list.updateComplete;
		list.activateFirst();
		await list.updateComplete;
		this.#announce();
	}

	#announce(): void {
		const active = this.list?.activeOption;
		if (this.#ids.length === 0) {
			this.announcement = this.#msg("commandNone");
		} else if (active) {
			this.announcement = this.#msg("commandPosition", { label: active.label, pos: this.#ids.indexOf(active.value) + 1, count: this.#ids.length });
		} else {
			this.announcement = "";
		}
	}

	#hint(command: Command): string | undefined {
		return command.shortcut ? formatShortcut(command.shortcut, { platform: this.registry.platform, locale: this.#i18n.locale }) : undefined;
	}

	/** Rows for the list: the commands that apply now, as options and group headings. */
	#rows(): ListOption[] {
		const active = this.registry.active(this.#from);
		const rows: ListOption[] = [];
		const ids: string[] = [];
		const option = (c: Command, label = c.label): ListOption => {
			ids.push(c.id);
			return { value: c.id, label, hint: this.#hint(c) };
		};
		const grouped = (list: Command[]) => {
			const order: string[] = [];
			const byGroup = new Map<string, Command[]>();
			for (const c of list) {
				const g = c.group ?? "";
				if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
				byGroup.get(g)!.push(c);
			}
			for (const g of order) {
				if (g) rows.push({ value: `heading:${g}`, label: g, heading: true });
				for (const c of byGroup.get(g)!) rows.push(option(c));
			}
		};

		if (this.help) {
			grouped(active.filter((c) => c.shortcut));
		} else if (this.query.trim()) {
			for (const c of filterCommands(active.filter((c) => c.id !== OPEN_ID), this.query)) {
				rows.push(option(c, c.group ? `${c.group} · ${c.label}` : c.label));
			}
		} else {
			const pool = active.filter((c) => c.id !== OPEN_ID);
			const recent = this.#recent.map((id) => pool.find((c) => c.id === id)).filter((c): c is Command => !!c);
			if (recent.length) {
				rows.push({ value: "heading:recent", label: this.#msg("commandRecent"), heading: true });
				for (const c of recent) rows.push(option(c));
			}
			grouped(pool.filter((c) => !recent.includes(c)));
		}
		this.#ids = ids;
		return rows;
	}

	#onInput = (): void => {
		this.query = this.input?.value ?? "";
		this.help = false;
	};

	#onKeyDown = (e: KeyboardEvent): void => {
		if (e.isComposing) return;
		const list = this.list;
		switch (e.key) {
			case "ArrowDown":
			case "ArrowUp":
				e.preventDefault();
				list?.moveActive(e.key === "ArrowDown" ? 1 : -1);
				void list?.updateComplete.then(() => this.#announce());
				break;
			case "Enter":
				e.preventDefault();
				if (!this.help) list?.chooseActive();
				break;
			case "?":
				if (!this.query && !this.help) {
					e.preventDefault();
					this.help = true;
				}
				break;
		}
	};

	#onChoose = (): void => {
		const list = this.list;
		const id = typeof list?.value === "string" ? list.value : "";
		if (list) list.value = "";
		if (!id || this.help) return;
		void this.#run(id);
	};

	async #run(id: string): Promise<void> {
		this.#recent = [id, ...this.#recent.filter((r) => r !== id)].slice(0, RECENT_MAX);
		this.hide();
		// Let the dialog close and give focus back first, so a command that moves focus wins.
		await this.updateComplete;
		await this.renderRoot.querySelector("dj-dialog")?.updateComplete;
		if (this.registry.execute(id)) this.emit("dj-command-run", { detail: { id } });
	}

	override render() {
		const name = this.label ?? this.#msg("commandPalette");
		const rows = this.#rows();
		const empty = this.#ids.length === 0;
		return html`<dj-dialog part="dialog" ?open=${this.open} aria-label=${name} @dj-close=${() => { this.open = false; }}>
			<div class="body">
				<input part="input" type="text" role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-autocomplete="list"
					aria-controls="results" aria-label=${name} autocomplete="off" spellcheck="false"
					placeholder=${this.placeholder ?? this.#msg("commandSearch")}
					.value=${this.query} @input=${this.#onInput} @keydown=${this.#onKeyDown} />
				${this.help ? html`<div class="title">${this.#msg("commandHelpTitle")}</div>` : nothing}
				<dj-list id="results" part="list" label=${this.help ? this.#msg("commandHelpTitle") : this.#msg("commandsGroup")}
					.options=${rows} @change=${this.#onChoose}></dj-list>
				${empty ? html`<div class="empty">${this.#msg("commandNone")}</div>` : nothing}
				<div class="sr" role="status">${this.announcement}</div>
			</div>
		</dj-dialog>`;
	}
}

declare global {
	interface GlobalEventHandlersEventMap { "dj-command-run": CustomEvent<{ id: string }>; }
}
