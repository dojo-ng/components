"""
gencatalog.py — generate the dojo-ng skill's component catalog (references/components.md).

Run from components/:  python3 gencatalog.py   (or `npm run catalog`)
Output:                ../skill/dojo-ng/references/components.md

Single source of truth: the same source extraction (genlib.py) that feeds the
custom-elements manifest, the consolidated reference (gendocs.py), and the per-package
READMEs (genreadmes.py). Grouping comes from gendocs.GROUPS; the primary worked example
per component comes from genreadmes.EXAMPLES. So the catalog cannot drift from the
components: add or change a component and re-run this, and the catalog follows.

The catalog is what the `dojo-ng` skill reads to pick and use a component, so each entry
carries a one-line "use when", the full property table, slots/parts/events/methods/CSS
properties, and a minimal example.
"""

import os
import genlib as G
from gendocs import GROUPS
from genreadmes import EXAMPLES

OUT = "../skill/dojo-ng/references/components.md"

# Stable editorial preamble (conventions the skill relies on; not derived from a component).
HEADER = """# Component catalog and picker

Status: GENERATED from the custom-elements manifest by `components/gencatalog.py`. Do not
edit by hand — run `npm run catalog` in `components/` to regenerate after a component
changes. For prose conventions, theming, i18n, and accessibility see the sibling reference
files; this file is the API catalog and picker.

## How to use this file

Match the user's need to a group in the picker, then to a component. Import the package to
register the tag, then use the element. Prefer composing existing components over building
new ones.

Conventions: importing `@dojo-ng/<name>` registers `<dj-<name>>`. In the property tables,
**Attribute** is the HTML attribute name (↻ = reflected to the DOM); a dash means the
property is set in JavaScript only (arrays, functions, and objects — `options`, `series`,
`data`, `columns`, `sources`, and the like — are always JS-only). Custom events are prefixed
`dj-`; some form controls also re-dispatch native `input`/`change`/`click`. Components expose
CSS `part`s for `::part()` styling and `--dj-*` custom properties for theming.
"""

UTILITIES = """
## Utilities and infrastructure

Not custom elements (except `<dj-theme>`); these support theming and app-level state.

- **`@dojo-ng/dojo-element`** — `DojoElement`, the Lit base class every component extends (typed `emit()`, idempotent `define()`, auto-registered `dependencies`); plus the `DojoFormControl` interface and shared `baseStyles`.
- **`@dojo-ng/theme`** — `theme.css` (the `--dj-*` token layers, light/dark/OS) and `<dj-theme theme="light|dark|auto">` for scoped theming.
- **`@dojo-ng/store`** — `createStore` (Zustand vanilla) and `StoreController`, a Lit reactive controller that re-renders a host on a selected store slice.
- **`@dojo-ng/context`** — the typed context-key registry (`storeContext`, `localeContext`) plus the `@lit/context` provider/consumer primitives.
- **`@dojo-ng/pubsub`** — `createPubSub()`: a publish/subscribe facade backed by the store (last value retained + replayed to late subscribers).
- **`@dojo-ng/i18n`** — locale controller, message store, and Intl format helpers used by the localized components.
"""


def has_pkg(pkg):
    return os.path.isdir(f"{G.PKGS}/{pkg}/src")


def example_code(pkg):
    """The primary worked example (genreadmes' first entry) for a package, if any."""
    exs = EXAMPLES.get(pkg)
    if not exs:
        return None
    # entries are (title, description, code)
    return exs[0][2]


def component_entry(pkg):
    _, s = G.main_file(pkg)
    if not s:
        return None
    tag = G.tag_of(pkg)
    doc = G.classdoc(s)
    o = [f"### `<{tag}>` · `@dojo-ng/{pkg}`\n"]
    sup = G.superclass(s)
    if sup != "DojoElement":
        o.append(f"*Extends `{sup}`; inherits its properties and behavior.*\n")
    d = G.description(doc, tag)
    if d:
        o.append(G.md_safe(d[0].upper() + d[1:]) + "\n")
    ps = G.parse_props(s)
    if ps:
        o.append("| Property | Attribute | Type | Default |")
        o.append("|---|---|---|---|")
        for p in ps:
            a = (p["attr"] or "—") + (" ↻" if p["reflects"] else "")
            default = ("`" + G.cell(p["default"]) + "`") if p["default"] else "—"
            o.append(f"| `{p['name']}` | {a} | `{G.cell(p['type'])}` | {default} |")
        o.append("")
    for label, items in (("Slots", G.parse_slots(doc, s)),
                         ("Parts", G.parse_parts(doc, s)),
                         ("Events", G.parse_events(doc, s))):
        if items:
            o.append(f"**{label}:** {G.md_safe(G.fmt_named_md(items))}\n")
    methods = G.parse_methods(s)
    if methods:
        o.append(f"**Methods:** {G.md_safe(G.fmt_methods_md(methods))}\n")
    cssprops = G.parse_cssprops(doc)
    if cssprops:
        o.append(f"**CSS properties:** {G.md_safe(G.fmt_cssprops_md(cssprops))}\n")
    code = example_code(pkg)
    if code:
        o.append("Example:\n")
        o.append("```html\n" + code + "\n```\n")
    return "\n".join(o)


def main():
    o = [HEADER]

    # Picker: one line per group, listing its tags. Kept in sync with GROUPS.
    o.append("## Picker by group\n")
    for group, names in GROUPS:
        tags = [f"`<{G.tag_of(p)}>`" for p in names if has_pkg(p)]
        if tags:
            o.append(f"- **{group}:** {', '.join(tags)}")
    o.append("")

    seen = set()
    for group, names in GROUPS:
        o.append(f"\n## {group}\n")
        for pkg in names:
            if not has_pkg(pkg):
                continue
            entry = component_entry(pkg)
            if not entry:
                continue
            seen.add(pkg)
            o.append(entry)

    o.append(UTILITIES)

    open(OUT, "w").write("\n".join(o).rstrip() + "\n")
    print(f"catalog: {len(seen)} components → {OUT}")


if __name__ == "__main__":
    main()
