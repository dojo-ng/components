import type { ComplexAttributeConverter } from "lit";

/**
 * Attribute converter for a boolean property that defaults to `true`.
 *
 * Lit's stock `Boolean` converter treats any present attribute as `true`, so a default-true
 * property could never be turned off from HTML: `<dj-dialog closeable="false">` still read as
 * `true`. With this converter the attribute string `"false"` (any case, surrounding spaces
 * ignored) means `false`; any other present value means `true`; removing the attribute means
 * `false`. A property left without the attribute keeps its `true` default.
 *
 * When the property reflects, `false` removes the attribute and `true` writes it empty, the
 * same as Lit's `Boolean` converter.
 *
 * ```ts
 * @property({ type: Boolean, converter: defaultTrueBoolean }) closeable = true;
 * ```
 */
export const defaultTrueBoolean: ComplexAttributeConverter<boolean> = {
	fromAttribute(value: string | null): boolean {
		return value !== null && value.trim().toLowerCase() !== "false";
	},
	toAttribute(value: boolean): string | null {
		return value ? "" : null;
	},
};
