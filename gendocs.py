"""
gendocs.py — generate the consolidated component reference (Markdown).

Run from components/:  python3 gendocs.py
Output:               docs/components-reference.md

Source extraction lives in genlib.py (shared with gencem.py / genreadmes.py).
"""

import os
import genlib as G

GROUPS = [
 ("Form controls", ["button","action-button","floating-action-button","copy-button","label","helper-text","text-input","email-input","number-input","password-input","constrained-input","text-area","native-select","select","typeahead","chip-typeahead","search-box","checkbox","checkbox-group","radio","radio-group","switch","slider","range-slider","rate","date-input","time-picker","color-picker","file-input","form"]),
 ("Overlays", ["popup","trigger-popup","context-popup","dropdown","popup-confirmation","context-menu","dialog","slide-pane","tooltip","snackbar"]),
 ("Layout", ["card","header-card","stack","split-panel","two-column-layout","three-column-layout","title-pane","accordion","carousel"]),
 ("Navigation", ["breadcrumb-group","header","toolbar","pagination","tab-container","wizard","speed-dial","tree","nav"]),
 ("Data display", ["board","list","grid","data-grid","calendar","avatar","badge","chip","icon","result","text"]),
 ("Charts", ["chart"]),
 ("Editing", ["rich-text"]),
 ("Feedback", ["alert","progress","loading-indicator","skeleton","global-event"]),
 ("Animation", ["transition","transition-group"]),
 ("Media", ["audio","video"]),
]

# Appends enterprise/tests/doc_groups.py's own GROUPS list when the overlay is checked out, so
# an overlay package needs no edit to this public file to get a heading here — same "merge
# behind an existence check" shape as tests/element-packages.js (O3). A public-only clone has
# no such file and GROUPS is unaffected.
#
# NOTE this does NOT make main()'s own output overlay-aware: components-reference.md is one of
# O6's leak-gated artifacts, so the loop below stays pinned to G.FOSS_ROOT regardless of what
# GROUPS contains. What this buys is a single place (this list) an overlay-side doc generator
# can import GROUPS from, complete, without this file needing to know that generator exists.
_overlay_groups = G.load_overlay_module("enterprise/tests/doc_groups.py")
if _overlay_groups is not None:
    GROUPS = GROUPS + getattr(_overlay_groups, "GROUPS", [])

def main():
  o = ["# Dojo NG component reference\n",
"First-pass API reference for the Dojo NG web components, generated from source. For conventions (naming, `--dj-*` theming tokens, events, the WCAG 2.2 AA / mobile requirements) see `component-conventions.md`; for theming see `theming-proposal.md`; for state/data see `state-and-framework-analysis.md`.\n",
"Usage: import a package to register its tag, then use it. Example:\n",
"```html\n<script type=\"module\">import \"@dojo-ng/button\";</script>\n<dj-button kind=\"outlined\">Save</dj-button>\n```\n",
"In the property tables, **Attribute** is the HTML attribute name (↻ = reflected to the DOM); a dash means the property is set in JavaScript only. Components also expose CSS `part`s for `::part()` styling.\n"]

  seen = set()
  for group, names in GROUPS:
    # Built into `body` first and only appended with its header if non-empty — an
    # overlay-only group whose packages never resolve under G.FOSS_ROOT must contribute
    # NOTHING, not even a bare "## <group>" heading with nothing under it. That heading
    # would itself be the leak: this doc is one of O6's byte-identical artifacts.
    body = []
    for pkg in names:
        # FOSS-only (see the GROUPS note above): an overlay group's package names never
        # resolve under G.FOSS_ROOT, so they're silently skipped here.
        if not os.path.isdir(f"{G.FOSS_ROOT}/{pkg}/src"):
            continue
        seen.add(pkg)
        for _, s in G.component_files(pkg):
            if not s:
                continue
            cls = G.class_name(s)
            tag = G.tag_for_class(pkg, cls)
            doc = G.classdoc(s)
            body.append(f"\n### `<{tag}>` · `@dojo-ng/{pkg}`\n")
            sup = G.superclass(s)
            if sup != "DojoElement":
                body.append(f"*Extends `{sup}`; inherits its properties and behavior.*\n")
            d = G.description(doc, tag)
            if d:
                body.append(G.md_safe(d[0].upper() + d[1:]) + "\n")
            ps = G.parse_props(s)
            if ps:
                body.append("| Property | Attribute | Type | Default |")
                body.append("|---|---|---|---|")
                for p in ps:
                    a = (p["attr"] or "—") + (" ↻" if p["reflects"] else "")
                    default = ("`" + G.cell(p["default"]) + "`") if p["default"] else "—"
                    body.append(f"| `{p['name']}` | {a} | `{G.cell(p['type'])}` | {default} |")
                body.append("")
            for label, items in (("Slots", G.parse_slots(doc, s)),
                                 ("Parts", G.parse_parts(doc, s)),
                                 ("Events", G.parse_events(doc, s))):
                if items:
                    body.append(f"**{label}:** {G.md_safe(G.fmt_named_md(items))}\n")
            methods = G.parse_methods(s)
            if methods:
                body.append(f"**Methods:** {G.md_safe(G.fmt_methods_md(methods))}\n")
            cssprops = G.parse_cssprops(doc)
            if cssprops:
                body.append(f"**CSS properties:** {G.md_safe(G.fmt_cssprops_md(cssprops))}\n")
    if body:
        o.append(f"\n## {group}\n")
        o.extend(body)

  o.append("\n## Utilities and infrastructure\n")
  o.append("Not custom elements (except `<dj-theme>`); these support theming and app-level state.\n")
  o.append("- **`@dojo-ng/dojo-element`** — `DojoElement`, the Lit base class every component extends (typed `emit()`, idempotent `define()`, auto-registered `dependencies`); plus the `DojoFormControl` interface and shared `baseStyles`.")
  o.append("- **`@dojo-ng/theme`** — `theme.css` (the `--dj-*` token layers, light/dark/OS) and `<dj-theme theme=\"light|dark|auto\">` for scoped theming.")
  o.append("- **`@dojo-ng/store`** — `createStore` (Zustand vanilla) and `StoreController`, a Lit reactive controller that re-renders a host on a selected store slice.")
  o.append("- **`@dojo-ng/context`** — the typed context-key registry (`storeContext`, `localeContext`) plus the `@lit/context` provider/consumer primitives.")

  open("docs/components-reference.md", "w").write("\n".join(o))
  print("documented:", len(seen))


if __name__ == "__main__":
  main()
