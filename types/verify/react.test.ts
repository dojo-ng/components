// Type-level smoke test for react.d.ts against the real @types/react.
// Self-checking: the negative cases use @ts-expect-error, so if the typings are
// too loose (or the augmentation didn't merge), tsc fails on the unused directive.
import type * as React from "react";

type ButtonProps = React.JSX.IntrinsicElements["dj-button"];

// Positive: a typed union prop and a boolean attribute.
const ok: ButtonProps = { kind: "outlined", disabled: true };

// Negative: invalid value for the `kind` union (DjButton["kind"]).
// @ts-expect-error
const badKind: ButtonProps = { kind: "not-a-kind" };

// Data-driven element exposes its JS-only property.
type ListProps = React.JSX.IntrinsicElements["dj-list"];
const list: ListProps = { options: [{ value: "a", label: "A" }] };

void ok; void badKind; void list;
