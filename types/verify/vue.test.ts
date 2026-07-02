// Type-level smoke test for vue.d.ts against the real Vue types.
// Confirms the tags are registered on GlobalComponents (what Volar reads for
// template type-checking). Full template prop/emit checking needs vue-tsc on a
// .vue SFC; this asserts the augmentation merged and the entries exist.
import type { GlobalComponents } from "@vue/runtime-core";

type Button = GlobalComponents["dj-button"]; // must exist
type Select = GlobalComponents["dj-select"]; // data-driven element

// Negative: a tag we do not define must NOT exist on GlobalComponents.
// @ts-expect-error
type Missing = GlobalComponents["dj-not-real"];

declare const _b: Button;
declare const _s: Select;
void _b; void _s;
