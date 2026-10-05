import { html, css } from "lit";
import { property } from "lit/decorators.js";
import DojoElement from "@dojo-ng/dojo-element";
import type { DjTransition } from "@dojo-ng/transition";

/**
 * `<dj-transition-group>` — staggers the `show` of its `dj-transition` children.
 *
 * The effects live on the children. The group only sets each child's `show`, with a delay.
 *
 * #### How it works
 * - When the group's `show` changes, it sets each child's `show` in DOM order. Child `i`
 *   starts after `i * stagger` milliseconds, for both enter and leave.
 * - When every child has finished, the group emits one `dj-after-enter` or `dj-after-leave`.
 * - Slotted elements that are not `dj-transition` are ignored.
 *
 * #### Not built
 * - List-move (FLIP) animation.
 * - Forwarding `appear` to the children. Set `appear` on each child instead.
 *
 * Slots:
 *  - (default) — the `dj-transition` children to coordinate.
 *
 * Events:
 *  - `dj-after-enter` — fired once after all children finish entering.
 *  - `dj-after-leave` — fired once after all children finish leaving.
 */
export class DjTransitionGroup extends DojoElement {
	static override version = "0.1.1";
	static override styles = css`
		:host { display: block; }
	`;

	/** Target visibility, propagated to the children with a stagger. */
	@property({ type: Boolean, reflect: true }) show = false;
	/** Milliseconds between successive children. 0 = all in the same tick. */
	@property({ type: Number }) stagger = 0;

	/** Generation counter: a run abandons itself if this changes mid-flight. */
	#token = 0;
	#timers: ReturnType<typeof setTimeout>[] = [];
	#safetyTimer?: ReturnType<typeof setTimeout>;
	#onChildDone: ((event: Event) => void) | null = null;
	#initialized = false;

	protected override updated(changed: Map<PropertyKey, unknown>) {
		if (!this.#initialized) { this.#initialized = true; return; }
		if (changed.has("show")) this.#run(this.show);
	}

	#children(): DjTransition[] {
		const slot = this.renderRoot.querySelector("slot");
		if (!slot) return [];
		return slot
			.assignedElements()
			.filter((el): el is DjTransition => el.tagName === "DJ-TRANSITION");
	}

	#cleanup() {
		for (const timer of this.#timers) clearTimeout(timer);
		this.#timers = [];
		if (this.#safetyTimer !== undefined) { clearTimeout(this.#safetyTimer); this.#safetyTimer = undefined; }
		if (this.#onChildDone) {
			this.removeEventListener("dj-after-enter", this.#onChildDone);
			this.removeEventListener("dj-after-leave", this.#onChildDone);
			this.#onChildDone = null;
		}
	}

	#run(value: boolean) {
		const token = ++this.#token;
		this.#cleanup();
		const children = this.#children();
		const count = children.length;
		const doneEvent = value ? "dj-after-enter" : "dj-after-leave";

		// Finish (once): stop listening/timers, then emit the single group event.
		const finish = () => {
			if (token !== this.#token) return;
			this.#cleanup();
			this.emit(doneEvent);
		};

		if (count === 0) { finish(); return; }

		// Count children completing their phase. Child events bubble/compose to the group;
		// filter to this generation's tracked children and the matching phase.
		let fired = 0;
		this.#onChildDone = (event: Event) => {
			if (token !== this.#token || event.type !== doneEvent) return;
			const target = event.target as HTMLElement | null;
			if (!target || target === this || !children.includes(target as DjTransition)) return;
			if (++fired >= count) finish();
		};
		this.addEventListener(doneEvent, this.#onChildDone);

		children.forEach((child, i) => {
			this.#timers.push(setTimeout(() => {
				if (token !== this.#token) return;
				child.show = value;
			}, i * this.stagger));
		});

		// Safety net: a child that never fires (e.g. it was already in the target state)
		// must not wedge the group. Emit anyway once the slowest child plus a margin passes.
		this.#safetyTimer = setTimeout(finish, this.stagger * count + 3000);
	}

	override disconnectedCallback() { super.disconnectedCallback(); this.#cleanup(); }

	override render() { return html`<slot></slot>`; }
}
export default DjTransitionGroup;
