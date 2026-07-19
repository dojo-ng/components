import type DojoElement from "./index.js";
import { state } from "lit/decorators.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = abstract new (...args: any[]) => T;

/** The shape a restored form value can take (mirrors `ElementInternals.setFormValue`). */
export type FormRestoreState = File | string | FormData | null;

/**
 * The five validation states the mixin mirrors onto the host, as data attributes and
 * (where supported) `CustomStateSet` states. Consumers style from outside the shadow
 * root with e.g. `dj-text-input[data-dj-user-invalid] { --dj-input-border-color: … }`.
 * Semantics follow Shoelace: `user-*` variants only turn on after the user has interacted.
 */
const VALIDITY_STATES = ["required", "valid", "invalid", "user-valid", "user-invalid"] as const;

export interface FormControlMixinInterface {
	/** True while an ancestor `<fieldset>`/`<form>` is disabled. */
	formDisabled: boolean;
	/** The control's own `disabled` OR an ancestor form's disabled state. */
	readonly isDisabled: boolean;
	formDisabledCallback(disabled: boolean): void;
	formStateRestoreCallback(state: FormRestoreState, mode: string): void;
	/** Restore submitted state (bfcache/autofill). Override for checked/number/array/range. */
	restoreFormState(state: FormRestoreState): void;
}

/**
 * Shared form-participation behavior for form-associated `DojoElement` controls,
 * so it lives in one place instead of being copied into every control.
 *
 *  - `formDisabledCallback` records an ancestor `<fieldset>`/`<form>` disabled state
 *    in the reactive `formDisabled` flag. Controls read `isDisabled` (their own
 *    `disabled` OR `formDisabled`) wherever they render or act disabled, so a
 *    disabled fieldset now disables the control.
 *  - `formStateRestoreCallback` restores state after bfcache navigation or autofill
 *    via `restoreFormState`, which defaults to the string `value` (setting it runs
 *    the control's existing `updated()`/sync). Controls whose value is not a plain
 *    string (checked, number, array, range) override `restoreFormState`.
 *  - **Validation-state styling hook.** The mixin mirrors the control's current
 *    validity onto the host as data attributes so consumers can style invalid/valid
 *    states from outside the shadow root (`data-dj-required`, `data-dj-valid` /
 *    `data-dj-invalid`, and `data-dj-user-valid` / `data-dj-user-invalid`, the last
 *    pair only once the user has interacted). It READS `internals.validity` and never
 *    calls `setValidity` — controls keep owning their validity. It learns the
 *    `internals` object by capturing the return of `attachInternals()` (each control
 *    already calls it), and re-syncs exactly when validity changes by wrapping
 *    `internals.setValidity`, plus on the interaction events that flip "interacted".
 *    Where `CustomStateSet` exists the same five states are also set (guarded).
 *
 * Use as `class DjX extends FormControl(DojoElement) { ... }`. The concrete control
 * still declares its own `disabled` and `value`/`checked` reactive properties. The
 * explicit return type keeps the `Base` intersection intact through declaration emit
 * (composite build), so subclasses still see DojoElement's members.
 */
export function FormControl<T extends Constructor<DojoElement>>(
	Base: T,
): T & Constructor<FormControlMixinInterface> {
	abstract class FormControlElement extends Base implements FormControlMixinInterface {
		@state() formDisabled = false;

		/** The control's own `disabled` reactive property (declared by the concrete class). */
		declare disabled: boolean;

		/** Captured from the control's own `attachInternals()` call (see the override below). */
		#internals?: ElementInternals;
		/** The user has changed the control's value at least once this interaction cycle. */
		#inputHappened = false;
		/** The user has interacted enough to warrant the `user-*` variants (blur-after-input or submit). */
		#interacted = false;
		/** Torn down on disconnect; scopes the host listeners. */
		#hostListeners?: AbortController;
		/** Rebound whenever form association changes; scopes the form's submit/reset listeners. */
		#formListeners?: AbortController;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		constructor(...args: any[]) {
			super(...args);
			// A reactive controller is the one post-render hook that survives subclasses
			// overriding `updated()` without calling super; it keeps `data-dj-required`
			// in step when a control changes `required` without touching validity.
			this.addController({ hostUpdated: () => this.#syncValidityAttributes() });
		}

		get isDisabled(): boolean {
			return this.disabled || this.formDisabled;
		}

		formDisabledCallback(disabled: boolean): void {
			this.formDisabled = disabled;
		}

		formStateRestoreCallback(state: FormRestoreState, _mode: string): void {
			this.restoreFormState(state);
		}

		restoreFormState(state: FormRestoreState): void {
			(this as unknown as { value: unknown }).value = state == null ? "" : state;
		}

		/**
		 * Capture the control's `ElementInternals` (each control calls `this.attachInternals()`
		 * in its constructor, which resolves here) and wrap `setValidity` so the host's
		 * validation-state attributes re-sync the instant validity changes.
		 */
		override attachInternals(): ElementInternals {
			const internals = super.attachInternals();
			this.#internals = internals;
			try {
				const original = internals.setValidity.bind(internals);
				internals.setValidity = (...a: Parameters<ElementInternals["setValidity"]>) => {
					original(...a);
					this.#syncValidityAttributes();
				};
			} catch {
				// Some engines may not allow shadowing the method; the controller + listeners
				// still keep the attributes reasonably fresh.
			}
			return internals;
		}

		override connectedCallback(): void {
			super.connectedCallback();
			const ac = (this.#hostListeners = new AbortController());
			const opts = { signal: ac.signal };
			// A value change means the user has typed/toggled something this cycle.
			const markInput = () => {
				this.#inputHappened = true;
			};
			this.addEventListener("input", markInput, opts);
			this.addEventListener("change", markInput, opts);
			// Blur after an edit, or a failed validity report, counts as interaction.
			this.addEventListener("focusout", () => {
				if (this.#inputHappened) this.#markInteracted();
			}, opts);
			this.addEventListener("invalid", () => this.#markInteracted(), opts);
			this.#bindForm();
			this.#syncValidityAttributes();
		}

		override disconnectedCallback(): void {
			super.disconnectedCallback();
			this.#hostListeners?.abort();
			this.#formListeners?.abort();
		}

		formAssociatedCallback(_form: HTMLFormElement | null): void {
			this.#bindForm();
		}

		/** (Re)bind the associated form's submit (→ interacted) and reset (→ clear) listeners. */
		#bindForm(): void {
			this.#formListeners?.abort();
			const form = this.#internals?.form;
			if (!form) return;
			const ac = (this.#formListeners = new AbortController());
			const opts = { signal: ac.signal };
			form.addEventListener("submit", () => this.#markInteracted(), opts);
			form.addEventListener("reset", () => {
				this.#inputHappened = false;
				this.#interacted = false;
				this.#syncValidityAttributes();
			}, opts);
		}

		#markInteracted(): void {
			this.#interacted = true;
			this.#syncValidityAttributes();
		}

		/** Mirror the current validity onto the host as data attributes + custom states. */
		#syncValidityAttributes(): void {
			const validity = this.#internals?.validity;
			if (!validity) return;
			const required = !!(this as { required?: boolean }).required;
			const valid = validity.valid;
			const flags: Record<(typeof VALIDITY_STATES)[number], boolean> = {
				required,
				valid,
				invalid: !valid,
				"user-valid": this.#interacted && valid,
				"user-invalid": this.#interacted && !valid,
			};
			const states = (this.#internals as { states?: Set<string> } | undefined)?.states;
			for (const name of VALIDITY_STATES) {
				const on = flags[name];
				this.toggleAttribute(`data-dj-${name}`, on);
				// Bonus: the same states via CustomStateSet, where the engine supports it.
				if (states) {
					try {
						if (on) states.add(name);
						else states.delete(name);
					} catch {
						// Older engines require a `--` prefix and throw on bare idents; the
						// data attributes above remain the documented, portable hook.
					}
				}
			}
		}
	}
	return FormControlElement;
}
