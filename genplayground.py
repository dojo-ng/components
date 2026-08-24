"""
genplayground.py — generate the playground's group order, sidebar nav, and demo-coverage
report from gendocs.GROUPS.

Run from components/:  python3 genplayground.py   (or `npm run playground`)

Same family as gencatalog.py: it imports GROUPS from gendocs.py rather than keeping its own
copy, so the playground's grouping cannot drift from the consolidated reference, the
per-package READMEs, the custom-elements manifest, or the skill catalog — they all come from
the same list.

Each demo in playground/index.html lives in a hand-written `<section id="..."
data-dj-packages="...">` (see task 1 of playground-organization-spec.md). This script reads
those sections out of the GENERATED:SECTIONS marker region, groups them by the GROUPS entry
their first-listed package belongs to, and rewrites three marked regions in place:

  GENERATED:NAV          the sidebar nav — one heading per group, one link per section
  GENERATED:SECTIONS     the same section bodies, reordered by group, each group preceded
                          by a generated heading
  GENERATED:COVERAGE     how many of the library's packages have a demo here, and which
                          ones don't
  GENERATED:HEADER-STATS the one-line count summary in the page header

A section's own markup (the hand-written content between `<section ...>` and `</section>`,
including its heading and one-line purpose statement) is treated as an opaque, verbatim
block: this script relocates sections, it never rewrites what's inside one.

Idempotent: re-run on its own output with nothing changed, it reads sections already in
group order and writes back the same bytes.
"""

import json
import os
import re
import sys

import genlib as G
from gendocs import GROUPS

INDEX = "playground/index.html"

# The same small set of non-visual "utilities and infrastructure" packages gendocs.py and
# gencatalog.py both already document by hand outside the GROUPS loop (theme, store,
# context, ...). A playground section may legitimately demonstrate one of these — Shared
# state and Scoped theme island do — without that being a GROUPS omission worth failing the
# build over.
UTILITY_PACKAGES = {"dojo-element", "theme", "store", "context", "export-core", "i18n"}

# Where a section's point is a seam rather than any single package (Submitted form data:
# native form participation, not a component) — see playground-organization-spec.md task 5.
SEAM_GROUP = "Framework seams"

SECTION_RE = re.compile(
    r'<section id="(?P<id>[a-z0-9-]+)" data-dj-packages="(?P<pkgs>[^"]*)">.*?</section>\n',
    re.DOTALL,
)
HEADING_RE = re.compile(r"<h3>(.*?)</h3>", re.DOTALL)


def marker_span(text, name):
    begin = f"<!-- GENERATED:{name} BEGIN -->"
    end = f"<!-- GENERATED:{name} END -->"
    i = text.index(begin)
    j = text.index(end, i)
    return i, i + len(begin), j, j + len(end)


def replace_marker(text, name, new_body):
    b0, b1, e0, e1 = marker_span(text, name)
    return text[:b1] + new_body + text[e0:]


def pkg_to_group_map():
    m = {}
    for group, names in GROUPS:
        for n in names:
            m[n] = group
    return m


def all_packages():
    return sorted(d for d in os.listdir(G.FOSS_ROOT) if os.path.isdir(f"{G.FOSS_ROOT}/{d}/src"))


def parse_sections(text):
    ns, ne, ns2, ne2 = marker_span(text, "SECTIONS")
    region = text[ne:ns2]
    sections = []
    for m in SECTION_RE.finditer(region):
        pkgs = [p for p in m.group("pkgs").split() if p]
        heading_m = HEADING_RE.search(m.group(0))
        if not heading_m:
            print(f"genplayground: section {m.group('id')!r} has no <h3> heading", file=sys.stderr)
            sys.exit(1)
        sections.append({
            "id": m.group("id"),
            "pkgs": pkgs,
            "body": m.group(0),
            "heading": re.sub(r"\s+", " ", heading_m.group(1)).strip(),
        })
    tag_count = region.count("<section id=")
    if len(sections) != tag_count:
        print(f"genplayground: found {tag_count} <section> tags but only parsed "
              f"{len(sections)} — a section body did not match the expected shape", file=sys.stderr)
        sys.exit(1)
    ids = [s["id"] for s in sections]
    if len(set(ids)) != len(ids):
        dupes = sorted({i for i in ids if ids.count(i) > 1})
        print(f"genplayground: duplicate section id(s): {', '.join(dupes)}", file=sys.stderr)
        sys.exit(1)
    return sections


def assign_groups(sections, pkg_to_group):
    for s in sections:
        pkgs = s["pkgs"]
        for p in pkgs:
            if p not in pkg_to_group and p not in UTILITY_PACKAGES:
                print(f"genplayground: section {s['id']!r} tags package {p!r}, which is "
                      f"not in gendocs.GROUPS and not a recognized utility package", file=sys.stderr)
                sys.exit(1)
        if not pkgs:
            s["group"] = SEAM_GROUP
        else:
            first = pkgs[0]
            s["group"] = pkg_to_group.get(first, SEAM_GROUP)


def build_groups(sections):
    group_order = [g for g, _ in GROUPS] + [SEAM_GROUP]
    by_group = {g: [] for g in group_order}
    for s in sections:
        by_group[s["group"]].append(s)
    placed = sum(len(v) for v in by_group.values())
    if placed != len(sections):
        # A package that has a section but no placement: every section must land in
        # exactly one bucket, since pkg_to_group is derived from GROUPS itself.
        print("genplayground: a section did not land in any group — internal error", file=sys.stderr)
        sys.exit(1)
    return group_order, by_group


def render_sections(group_order, by_group):
    out = ["\n"]
    for group in group_order:
        secs = by_group[group]
        if not secs:
            continue
        out.append(f'\t\t\t\t<h2 class="group-heading">{group}</h2>\n')
        for s in secs:
            out.append(s["body"])
    return "".join(out)


def render_nav(group_order, by_group):
    out = ['\n\t\t\t<nav id="playground-nav" aria-label="Playground sections">\n']
    for group in group_order:
        secs = by_group[group]
        if not secs:
            continue
        out.append(f"\t\t\t\t<h2>{group}</h2>\n\t\t\t\t<ul>\n")
        for s in secs:
            out.append(f'\t\t\t\t\t<li><a href="#{s["id"]}">{s["heading"]}</a></li>\n')
        out.append("\t\t\t\t</ul>\n")
    out.append("\t\t\t</nav>\n\t\t\t")
    return "".join(out)


def render_coverage(sections):
    all_pkgs = all_packages()
    covered = set()
    for s in sections:
        covered.update(s["pkgs"])
    no_demo = sorted(set(all_pkgs) - covered)
    n_covered = len(all_pkgs) - len(no_demo)
    items = "".join(f"\t\t\t\t\t<li>{p}</li>\n" for p in no_demo)
    return (
        "\n\t\t\t\t<details class=\"coverage\">\n"
        f"\t\t\t\t\t<summary>{n_covered} of {len(all_pkgs)} shipped packages have a demo on this page"
        f" ({len(no_demo)} do not)</summary>\n"
        "\t\t\t\t\t<ul>\n"
        f"{items}"
        "\t\t\t\t\t</ul>\n"
        "\t\t\t\t</details>\n\t\t\t"
    ), n_covered, len(all_pkgs)


def render_header_stats(sections, group_order, by_group, n_covered, n_total):
    n_groups = len([g for g in group_order if by_group[g] and g != SEAM_GROUP])
    version = "0.0.0"
    try:
        version = json.load(open("package.json")).get("version", version)
    except FileNotFoundError:
        pass
    return (
        f"{len(sections)} demo sections across {n_groups} groups, covering {n_covered} of "
        f"{n_total} shipped packages (see the coverage list at the foot of the page). "
        f"Built from Dojo NG v{version}."
    )


def main():
    text = open(INDEX, encoding="utf-8").read()

    sections = parse_sections(text)
    pkg_to_group = pkg_to_group_map()
    assign_groups(sections, pkg_to_group)
    group_order, by_group = build_groups(sections)

    coverage_html, n_covered, n_total = render_coverage(sections)

    text = replace_marker(text, "SECTIONS", render_sections(group_order, by_group))
    text = replace_marker(text, "NAV", render_nav(group_order, by_group))
    text = replace_marker(text, "COVERAGE", coverage_html)
    text = replace_marker(text, "HEADER-STATS", render_header_stats(sections, group_order, by_group, n_covered, n_total))

    open(INDEX, "w", encoding="utf-8").write(text)
    print(f"playground: {len(sections)} sections, {n_covered}/{n_total} packages covered")


if __name__ == "__main__":
    main()
