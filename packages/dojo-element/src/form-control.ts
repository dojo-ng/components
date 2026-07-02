import type DojoElement from "./index.js";
import { state } from "lit/decorators.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = abstract new (...args: any[]) => T;

/** The shape a restored form value can take (mirrors `ElementInternals.setFormValue`). */
export type FormRestoreState = File | string | FormData | null;

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
	}
	return FormControlElement;
}
