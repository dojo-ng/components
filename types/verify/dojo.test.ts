// Type-level smoke test for dojo.d.ts against the real component classes.
// The renderer base comes from dojo-renderer-stub.d.ts (the fork has no types
// yet). Real classes make the negative case fire: an invalid `kind` value is
// rejected because DjButton["kind"] is the real ButtonKind union.
import { tsx } from "@dojo-ng/framework";

type ButtonProps = tsx.JSX.IntrinsicElements["dj-button"];

// Positive: typed union prop, boolean attr, and DjVNodeBase extras (key, on*).
const ok: ButtonProps = { kind: "outlined", disabled: true, key: 1, onclick: () => {} };

// Negative: invalid value for the kind union.
// @ts-expect-error
const bad: ButtonProps = { kind: "not-a-kind" };

// Data-driven element exposes its JS-only property.
const list: tsx.JSX.IntrinsicElements["dj-list"] = { options: [] };

void ok; void bad; void list;
