// Type-level smoke test for solid.d.ts against the real solid-js types.
import type { JSX } from "solid-js";

type ButtonProps = JSX.IntrinsicElements["dj-button"];

// Positive: typed union prop.
const ok: ButtonProps = { kind: "text" };

// Negative: invalid union value.
// @ts-expect-error
const bad: ButtonProps = { kind: "nope" };

// Custom events are registered for Solid's on: namespace.
type CE = JSX.CustomEvents;
type DjClose = CE["dj-close"]; // should resolve to CustomEvent

void ok; void bad;
const _ev: DjClose = new CustomEvent("dj-close");
void _ev;
