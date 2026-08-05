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
import re
import genlib as G
from gendocs import GROUPS
from genreadmes import EXAMPLES, NOTES


def first_sentences(text, n=2):
    """The first `n` sentences of `text` (never new prose — just less of the existing NOTES).
    Every rich-text plugin's NOTES opens with the same administrative sentence ("An opt-in
    plugin for `@dojo-ng/rich-text` (not a custom element)."), which carries no differentiating
    information — genreadmes.first_sentence() alone reproduces only that boilerplate for the
    catalog's "one line on when to use it," which a PC4 eval caught concretely: asked about
    headings AND blockquotes, a model found `rich-text-headings` for the heading half but missed
    that the same plugin also covers blockquotes, because neither the boilerplate first sentence
    nor the generic wiring example ever says "quote." The substance is reliably in the sentence
    right after the boilerplate, so two sentences instead of one fixes it without inventing text."""
    # Don't split after "e.g.", "i.e.", or "etc." — a bare (?<=[.])\s treats the space after
    # any of those as a sentence boundary, which sliced data-grid-groups's second sentence in
    # half at "(e.g." during this task's own PC5 pass. Checked for real before trusting it: only
    # that one NOTES entry hit the bug today, but the fix belongs in the splitter, not a rewrite
    # of the prose to dodge it.
    parts = re.split(r"(?<!\be\.g\.)(?<!\bi\.e\.)(?<!\betc\.)(?<=[.])\s", text)
    return " ".join(parts[:n]).strip()

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


def component_entries(pkg):
    """One catalog entry per class the package registers (almost always one; `chart` has two —
    `dj-chart` and `dj-sparkline`). The primary worked example (genreadmes' first EXAMPLES entry
    for the package) is attached only to the FIRST entry, since it documents the package as a
    whole and a second class would otherwise repeat it verbatim."""
    entries = []
    files = G.component_files(pkg)
    for i, (_, s) in enumerate(files):
        cls = G.class_name(s)
        if not cls:
            continue
        tag = G.tag_for_class(pkg, cls)
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
        if i == 0:
            code = example_code(pkg)
            if code:
                o.append("Example:\n")
                o.append("```html\n" + code + "\n```\n")
        entries.append("\n".join(o))
    return entries


def plugins_for_host(host_pkg):
    """Plugin packages that belong under `host_pkg`'s entry, in name order. Source-driven per
    `G.plugin_host` — a package qualifies because its code calls `defineDataGridPlugin`/
    `defineRichTextPlugin`, never because of a `data-grid-`/`rich-text-` name prefix. This is
    also why a lookalike like `rich-text-menu` (menu plumbing, no such call) or `dnd` (a generic
    primitive, no host at all) never shows up here — see plugin-catalog-spec.md PC1."""
    return sorted(
        pkg for pkg in os.listdir(G.PKGS)
        if has_pkg(pkg) and pkg != host_pkg and G.plugin_host(pkg) == host_pkg
    )


def plugin_entry(pkg):
    """A plugin's catalog entry — deliberately smaller than component_entry(): the package name,
    the factory (or ready-made instance) and its options, a one-line "when to use it" (the first
    sentence of its NOTES, never new prose), and its primary worked example."""
    factory_name, factory_params, ready = G.plugin_api(pkg)
    label = factory_name or (ready[0] if ready else pkg)
    o = [f"#### `{label}` · `@dojo-ng/{pkg}`\n"]

    note = NOTES.get(pkg, "")
    if note:
        o.append(G.md_safe(first_sentences(note, 2)) + "\n")

    if factory_name:
        opts_type = G.options_type_of(factory_params)
        fields = G.interface_fields(pkg, opts_type)
        if fields:
            parts = []
            for f in fields:
                sig = f"`{f['name']}{'?' if f['optional'] else ''}{f['params']}: {G.cell(f['type'])}`"
                parts.append(f"{sig} ({f['description']})" if f["description"] else sig)
            o.append(f"**Options:** {G.md_safe(', '.join(parts))}\n")
        elif factory_params == "":
            o.append("No options.\n")
    if ready:
        names = ", ".join(f"`{n}`" for n in ready)
        if factory_name:
            o.append(f"**Ready-made:** {names} — import directly to use with defaults; call `{factory_name}(options)` yourself to customize.\n")
        else:
            o.append(f"**Ready-made:** {names} — the only export; nothing to configure.\n")

    code = example_code(pkg)
    if code:
        o.append("```html\n" + code + "\n```\n")
    return "\n".join(o)


def main():
    o = [HEADER]

    # Picker: one line per group, listing every tag each of its packages registers (almost
    # always one tag; `chart` registers two). Kept in sync with GROUPS.
    o.append("## Picker by group\n")
    for group, names in GROUPS:
        tags = []
        for p in names:
            if not has_pkg(p):
                continue
            for _, s in G.component_files(p):
                cls = G.class_name(s)
                if cls:
                    tags.append(f"`<{G.tag_for_class(p, cls)}>`")
        if tags:
            o.append(f"- **{group}:** {', '.join(tags)}")
    o.append("")

    seen = set()
    seen_plugins = set()
    for group, names in GROUPS:
        o.append(f"\n## {group}\n")
        for pkg in names:
            if not has_pkg(pkg):
                continue
            entries = component_entries(pkg)
            if not entries:
                continue
            seen.add(pkg)
            o.extend(entries)

            plugin_pkgs = plugins_for_host(pkg)
            if plugin_pkgs:
                tag = G.tag_of(pkg)
                o.append(f"**Plugins for `<{tag}>`** — pushed via the `plugins` property (JavaScript only).\n")
                for ppkg in plugin_pkgs:
                    seen_plugins.add(ppkg)
                    o.append(plugin_entry(ppkg))

    o.append(UTILITIES)

    open(OUT, "w").write("\n".join(o).rstrip() + "\n")
    print(f"catalog: {len(seen)} components + {len(seen_plugins)} plugins → {OUT}")


if __name__ == "__main__":
    main()
