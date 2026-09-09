import { LitElement } from "lit";
import { property } from "lit/decorators.js";

export { default as baseStyles, reducedMotion } from "./base-styles.js";
export { FOCUSABLE_SELECTOR, NATIVE_FOCUSABLE_SELECTOR, isFocusable, firstFocusable, deepActiveElement, collectFocusables, trapTabKey, isFocusWithin, dismissOnFocusOut } from "./focus-trap.js";
export { lockBodyScroll } from "./scroll-lock.js";
export { FormControl } from "./form-control.js";
export type { FormRestoreState, FormControlMixinInterface } from "./form-control.js";
export { TokenFlagController } from "./token-flag-controller.js";

// Match registered event types whose detail is a required, non-empty object.
type EventTypeRequiresDetail<T> = T extends keyof GlobalEventHandlersEventMap
	? GlobalEventHandlersEventMap[T] extends CustomEvent<Record<PropertyKey, unknown>>
		? GlobalEventHandlersEventMap[T] extends CustomEvent<Record<PropertyKey, never>>
			? never
			: Partial<GlobalEventHandlersEventMap[T]["detail"]> extends GlobalEventHandlersEventMap[T]["detail"]
				? never
				: T
		: never
	: never;

// The inverse: event types that do not require a detail payload.
type EventTypeDoesNotRequireDetail<T> = T extends keyof GlobalEventHandlersEventMap
	? GlobalEventHandlersEventMap[T] extends CustomEvent<Record<PropertyKey, unknown>>
		? GlobalEventHandlersEventMap[T] extends CustomEvent<Record<PropertyKey, never>>
			? T
			: Partial<GlobalEventHandlersEventMap[T]["detail"]> extends GlobalEventHandlersEventMap[T]["detail"]
				? T
				: never
		: T
	: T;

type EventTypesWithRequiredDetail = {
	[E in keyof GlobalEventHandlersEventMap as EventTypeRequiresDetail<E>]: true;
};
type EventTypesWithoutRequiredDetail = {
	[E in keyof GlobalEventHandlersEventMap as EventTypeDoesNotRequireDetail<E>]: true;
};

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

type DjEventInit<T> = T extends keyof GlobalEventHandlersEventMap
	? GlobalEventHandlersEventMap[T] extends CustomEvent<Record<PropertyKey, unknown>>
		? GlobalEventHandlersEventMap[T] extends CustomEvent<Record<PropertyKey, never>>
			? CustomEventInit<GlobalEventHandlersEventMap[T]["detail"]>
			: Partial<GlobalEventHandlersEventMap[T]["detail"]> extends GlobalEventHandlersEventMap[T]["detail"]
				? CustomEventInit<GlobalEventHandlersEventMap[T]["detail"]>
				: WithRequired<CustomEventInit<GlobalEventHandlersEventMap[T]["detail"]>, "detail">
		: CustomEventInit
	: CustomEventInit;

type GetCustomEventType<T> = T extends keyof GlobalEventHandlersEventMap
	? GlobalEventHandlersEventMap[T] extends CustomEvent<unknown>
		? GlobalEventHandlersEventMap[T]
		: CustomEvent<unknown>
	: CustomEvent<unknown>;

type ValidEventTypeMap = EventTypesWithRequiredDetail | EventTypesWithoutRequiredDetail;

/**
 * Base class for every Dojo NG web component. Extends LitElement with:
 *  - a typed `emit()` helper (bubbles + composed by default),
 *  - a `define()` registrar that is idempotent and warns on version conflicts,
 *  - automatic registration of declared `dependencies`,
 *  - reflected-property morph fixing.
 */
export default class DojoElement extends LitElement {
	/** Subclasses set this so version conflicts can be reported on re-registration. */
	static version?: string;

	/**
	 * Whether this element is a keyboard focus stop, for the focus trap
	 * (`collectFocusables`). Interactive components override this to `true`;
	 * display/layout components leave it `false`. Read off the constructor via
	 * `customElements.get(tag)`, so it replaces the old hand-maintained tag list.
	 */
	static focusable = false;

	@property() dir!: string;
	@property() lang!: string;
	@property() "x-qa"?: string;

	emit<T extends string & keyof EventTypesWithoutRequiredDetail>(
		name: EventTypeDoesNotRequireDetail<T>,
		options?: DjEventInit<T> | undefined,
	): GetCustomEventType<T>;
	emit<T extends string & keyof EventTypesWithRequiredDetail>(
		name: EventTypeRequiresDetail<T>,
		options: DjEventInit<T>,
	): GetCustomEventType<T>;
	emit<T extends string & keyof ValidEventTypeMap>(
		name: T,
		options?: DjEventInit<T> | undefined,
	): GetCustomEventType<T> {
		const event = new CustomEvent(name, {
			bubbles: true,
			cancelable: false,
			composed: true,
			detail: {},
			...options,
		});
		this.dispatchEvent(event);
		return event as GetCustomEventType<T>;
	}

	/** Registers a custom element with the browser. Idempotent; warns on version mismatch. */
	static define(
		name: string,
		elementConstructor: typeof DojoElement = this,
		options: ElementDefinitionOptions = {},
	) {
		const existing = customElements.get(name) as
			| (CustomElementConstructor & { version?: string })
			| undefined;

		if (!existing) {
			try {
				customElements.define(name, elementConstructor, options);
			} catch (_err) {
				customElements.define(name, class extends elementConstructor {}, options);
			}
			return;
		}

		const newVersion = elementConstructor.version
			? " v" + elementConstructor.version
			: " (unknown version)";
		const existingVersion = existing.version
			? " v" + existing.version
			: " (unknown version)";

		if (newVersion === existingVersion) {
			return;
		}

		console.warn(
			`Attempted to register <${name}>${newVersion}, but <${name}>${existingVersion} has already been registered.`,
		);
	}

	/** Child components that should be auto-registered when this element is constructed. */
	static dependencies: Record<string, typeof DojoElement> = {};

	constructor() {
		super();
		const ctor = this.constructor as typeof DojoElement;
		Object.entries(ctor.dependencies).forEach(([name, component]) => {
			ctor.define(name, component);
		});
	}

	#hasRecordedInitialProperties = false;
	initialReflectedProperties: Map<string, unknown> = new Map();

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
		if (!this.#hasRecordedInitialProperties) {
			(this.constructor as typeof DojoElement).elementProperties.forEach(
				(obj, prop: PropertyKey) => {
					if (obj.reflect && this[prop as keyof typeof this] != null) {
						this.initialReflectedProperties.set(
							String(prop),
							this[prop as keyof typeof this],
						);
					}
				},
			);
			this.#hasRecordedInitialProperties = true;
		}
		super.attributeChangedCallback(name, oldValue, newValue);
	}

	protected willUpdate(changedProperties: Parameters<LitElement["willUpdate"]>[0]): void {
		super.willUpdate(changedProperties);
		this.initialReflectedProperties.forEach((value, prop: string) => {
			if (changedProperties.has(prop) && (this as Record<string, unknown>)[prop] == null) {
				(this as Record<string, unknown>)[prop] = value;
			}
		});
	}
}

/** Shared interface for form-associated controls (inputs, select, checkbox, etc.). */
export interface DojoFormControl extends DojoElement {
	name: string;
	value: unknown;
	disabled?: boolean;
	defaultValue?: unknown;
	defaultChecked?: boolean;
	form?: string;
	pattern?: string;
	min?: number | string | Date;
	max?: number | string | Date;
	step?: number | string | "any";
	required?: boolean;
	minlength?: number;
	maxlength?: number;
	readonly validity: ValidityState;
	readonly validationMessage: string;
	checkValidity: () => boolean;
	getForm: () => HTMLFormElement | null;
	reportValidity: () => boolean;
	setCustomValidity: (message: string) => void;
}
