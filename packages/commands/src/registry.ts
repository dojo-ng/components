import { isTextEntryTarget } from "@dojo-ng/dojo-element";
import { SEQUENCE_GAP_MS, detectPlatform, isReserved, normalizeShortcut, parseShortcut, sameStep, stepOf } from "./shortcut.js";
import type { Platform, Step } from "./shortcut.js";

/** What an app action is. `run` gets the key event when a shortcut started it. */
export interface Command {
	id: string;
	label: string;
	/** Heading in the palette and the help view. */
	group?: string;
	/** Extra words the palette matches on. */
	keywords?: string;
	/** `"Mod+K"`, `"Alt+Mod+Digit1"`, or a sequence `"G I"`. Mod is Cmd on a Mac and Ctrl elsewhere. */
	shortcut?: string;
	/** Whether the command applies now. When it returns false the palette hides it and the shortcut does nothing. */
	when?: () => boolean;
	/** Let the shortcut fire while the user types in a text field (for Mod+K and Escape). */
	allowInText?: boolean;
	run: (event?: KeyboardEvent) => void;
}

export interface RegistryOptions {
	platform?: Platform;
	/** Milliseconds, for the sequence timeout. Tests pass a fake. */
	now?: () => number;
	warn?: (message: string) => void;
}

interface Entry {
	command: Command;
	steps: Step[] | null;
	scope: Element | null;
	order: number;
}

/** Commands registered on one element: the shortcut fires only while focus is inside it. */
export interface Scope {
	readonly element: Element;
	register(command: Command): () => void;
	/** Remove every command this scope registered. */
	dispose(): void;
}

export class CommandRegistry {
	readonly platform: Platform;
	#entries = new Map<string, Entry>();
	#order = 0;
	#warned = new Set<string>();
	#listeners = new Set<() => void>();
	#runListeners = new Set<(command: Command, event?: KeyboardEvent) => void>();
	#buffer: Step[] = [];
	#lastKeyAt = 0;
	#now: () => number;
	#warn: (message: string) => void;

	constructor(options: RegistryOptions = {}) {
		this.platform = options.platform ?? detectPlatform();
		this.#now = options.now ?? (() => Date.now());
		this.#warn = options.warn ?? ((m) => console.warn(m));
	}

	/** Add a command. Returns a function that removes it. An id registered twice replaces the first. */
	register(command: Command, scope: Element | null = null): () => void {
		let steps: Step[] | null = null;
		if (command.shortcut) {
			steps = parseShortcut(command.shortcut, this.platform);
			if (isReserved(steps, this.platform)) {
				this.#warnOnce(`reserved:${command.id}`, `Command "${command.id}": ${command.shortcut} is reserved by the browser and was not bound.`);
				steps = null;
			}
		}
		this.#entries.delete(command.id);
		const entry: Entry = { command, steps, scope, order: this.#order++ };
		if (steps) this.#reportConflicts(entry);
		this.#entries.set(command.id, entry);
		this.#changed();
		return () => {
			if (this.#entries.get(command.id) === entry) this.unregister(command.id);
		};
	}

	unregister(id: string): void {
		if (this.#entries.delete(id)) this.#changed();
	}

	/** A registration surface limited to `element`. */
	scope(element: Element): Scope {
		const ids = new Set<string>();
		return {
			element,
			register: (command) => {
				ids.add(command.id);
				const off = this.register(command, element);
				return () => {
					ids.delete(command.id);
					off();
				};
			},
			dispose: () => {
				for (const id of ids) {
					if (this.#entries.get(id)?.scope === element) this.unregister(id);
				}
				ids.clear();
			},
		};
	}

	get(id: string): Command | undefined {
		return this.#entries.get(id)?.command;
	}

	/**
	 * The commands that apply now: those whose `when` is not false and whose scope holds `from`
	 * (the focused element), or is global. Registration order. With no `from`, only global ones.
	 */
	active(from?: Element | null): Command[] {
		return [...this.#entries.values()]
			.filter((e) => this.#applies(e, from ? pathOf(from) : []))
			.sort((a, b) => a.order - b.order)
			.map((e) => e.command);
	}

	/** Run a command by id as the palette does; false when it is unknown or its `when` says no. */
	execute(id: string, event?: KeyboardEvent): boolean {
		const command = this.#entries.get(id)?.command;
		if (!command || command.when?.() === false) return false;
		command.run(event);
		for (const listener of this.#runListeners) listener(command, event);
		return true;
	}

	/** Called after a command runs, from the palette or a shortcut. */
	onRun(listener: (command: Command, event?: KeyboardEvent) => void): () => void {
		this.#runListeners.add(listener);
		return () => this.#runListeners.delete(listener);
	}

	/** Called when commands are added or removed. */
	onChange(listener: () => void): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	/** Listen for keys on `target` (the document by default). Returns a function that stops. */
	attach(target: EventTarget = document): () => void {
		const handler = (e: Event) => void this.handle(e as KeyboardEvent);
		target.addEventListener("keydown", handler);
		return () => target.removeEventListener("keydown", handler);
	}

	/** Decide what a key press asks for and run it. True when a command ran. */
	handle(event: KeyboardEvent): boolean {
		if (event.defaultPrevented || event.isComposing || /^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/.test(event.code)) return false;
		const now = this.#now();
		if (now - this.#lastKeyAt > SEQUENCE_GAP_MS) this.#buffer = [];
		this.#lastKeyAt = now;
		const path = eventPath(event);
		const inText = isTextEntryTarget(event);
		const candidates = [...this.#entries.values()]
			.filter((e) => e.steps && (!inText || e.command.allowInText) && this.#applies(e, path))
			.sort((a, b) => depthIn(a.scope, path) - depthIn(b.scope, path) || a.order - b.order);

		const step = stepOf(event);
		let buffer = [...this.#buffer, step];
		let hits = candidates.filter((e) => startsWith(e.steps!, buffer));
		if (hits.length === 0 && this.#buffer.length > 0) {
			buffer = [step];
			hits = candidates.filter((e) => startsWith(e.steps!, buffer));
		}
		if (hits.length === 0) {
			this.#buffer = [];
			return false;
		}
		const exact = hits.find((e) => e.steps!.length === buffer.length);
		if (!exact) {
			this.#buffer = buffer;
			return false;
		}
		this.#buffer = [];
		event.preventDefault();
		this.execute(exact.command.id, event);
		return true;
	}

	#applies(entry: Entry, path: readonly EventTarget[]): boolean {
		if (entry.command.when?.() === false) return false;
		return entry.scope === null || path.includes(entry.scope);
	}

	#reportConflicts(entry: Entry): void {
		const key = normalizeShortcut(entry.steps!);
		for (const other of this.#entries.values()) {
			if (other.command.id === entry.command.id || !other.steps || other.scope !== entry.scope) continue;
			const a = normalizeShortcut(other.steps);
			const clash = a === key || a.startsWith(`${key} `) || key.startsWith(`${a} `);
			if (!clash) continue;
			const pair = [other.command.id, entry.command.id].sort().join("|");
			this.#warnOnce(`conflict:${pair}`, `Commands "${other.command.id}" and "${entry.command.id}" both use ${entry.command.shortcut} in the same scope; "${other.command.id}" wins.`);
		}
	}

	#warnOnce(key: string, message: string): void {
		if (this.#warned.has(key)) return;
		this.#warned.add(key);
		this.#warn(message);
	}

	#changed(): void {
		for (const listener of this.#listeners) listener();
	}
}

function startsWith(steps: Step[], prefix: Step[]): boolean {
	return prefix.length <= steps.length && prefix.every((s, i) => sameStep(s, steps[i]!));
}

/** The element, then its ancestors across shadow boundaries, nearest first. */
function pathOf(from: Element): EventTarget[] {
	const path: EventTarget[] = [];
	let node: Node | null = from;
	while (node) {
		path.push(node);
		node = node.parentNode ?? (node as ShadowRoot).host ?? null;
	}
	return path;
}

function eventPath(event: Event): readonly EventTarget[] {
	const composed = event.composedPath();
	if (composed.length > 0) return composed;
	return event.target instanceof Element ? pathOf(event.target) : [];
}

/** How far up the path the scope sits: 0 is the target itself; a global command is last. */
function depthIn(scope: Element | null, path: readonly EventTarget[]): number {
	if (!scope) return Number.MAX_SAFE_INTEGER;
	return path.indexOf(scope);
}

/** The app-wide registry. Listens on the document from the first registration. */
export const commands = new CommandRegistry();

let attached = false;
const registerGlobal = commands.register.bind(commands);
commands.register = (command, scope = null) => {
	if (!attached && typeof document !== "undefined") {
		attached = true;
		commands.attach(document);
	}
	return registerGlobal(command, scope);
};
