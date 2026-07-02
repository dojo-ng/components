/**
 * Motion-wait helper for `<dj-transition>`. Kept in its own module so the timing
 * logic is unit-testable without a component.
 */

/**
 * Parse a comma-separated CSS time list (e.g. `"0.2s, 1s"`) and return the largest
 * value in milliseconds. Empty or absent input is 0. Values ending in `ms` are read
 * as-is; anything else (`s`) is treated as seconds and scaled to ms.
 */
export function maxList(value: string | undefined | null): number {
	if (!value) return 0;
	let max = 0;
	for (const raw of value.split(",")) {
		const time = raw.trim();
		if (!time) continue;
		const ms = time.endsWith("ms") ? parseFloat(time) : parseFloat(time) * 1000;
		if (!Number.isNaN(ms) && ms > max) max = ms;
	}
	return max;
}

/**
 * Resolve when `el`'s current CSS animation/transition finishes, or immediately when
 * there is none. Never hangs: a computed-duration fallback covers a missing effect and
 * a safety timeout covers a lost `animationend`/`transitionend` event.
 */
export function awaitMotion(el: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		// 1. Reduced motion: skip all waiting (also covers WAAPI effects CSS can't reach).
		if (
			typeof matchMedia === "function" &&
			matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			resolve();
			return;
		}

		// 2. Compute the expected duration. Reading computed style also forces the style
		//    recalc that starts the animation. max(durations)+max(delays) is a deliberate,
		//    documented approximation over pairwise sums.
		const cs = getComputedStyle(el);
		const animation = maxList(cs.animationDuration) + maxList(cs.animationDelay);
		const transition = maxList(cs.transitionDuration) + maxList(cs.transitionDelay);
		const total = Math.max(animation, transition);

		// 3. No effect defined → resolve now. Prevents the classic transition-wrapper hang.
		if (total <= 0) {
			resolve();
			return;
		}

		// 4. First of a matching end event or the safety timeout wins; tear both down.
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			el.removeEventListener("animationend", onEnd);
			el.removeEventListener("transitionend", onEnd);
			clearTimeout(timer);
			resolve();
		};
		const onEnd = (event: Event) => {
			if (event.target === el) finish();
		};
		el.addEventListener("animationend", onEnd);
		el.addEventListener("transitionend", onEnd);
		const timer = setTimeout(finish, total + 100);
	});
}
