/** A flat namespace of message strings: key -> template. */
export type Messages = Record<string, string>;

/** Interpolation parameters for `format`/`resolve`: values for `{name}` placeholders. */
export type FormatParams = Record<string, string | number>;
