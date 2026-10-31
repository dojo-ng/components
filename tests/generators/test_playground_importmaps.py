"""Every bare module specifier a playground page can reach must be in that page's import map.

The playground pages load the packages' built `dist/` straight from disk through a hand-written
`<script type="importmap">`, with no bundler. When a package starts importing a new bare
specifier (dj-card and dj-breadcrumb-group picking up `@dojo-ng/history/handle`, 2026-10-24),
nothing failed: the page's single module script simply threw "Failed to resolve module specifier"
in the browser, so no component on playground/index.html upgraded, until the B1 browser pass
found it five days later. This walks each page's module graph (its own inline module scripts,
then every local file the map points at, following relative imports too) and fails on the first
bare specifier the map doesn't cover.

Needs the packages built (CI's verify job runs `npm run build` first); skipped, with a reason,
when no package `dist/` exists yet, since a skip must never read as a pass.
"""

import glob
import json
import os
import re
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PLAYGROUND = os.path.join(ROOT, "playground")

IMPORTMAP_RE = re.compile(r'<script type="importmap">(.*?)</script>', re.DOTALL)
MODULE_SCRIPT_RE = re.compile(r'<script type="module">(.*?)</script>', re.DOTALL)
# Static `import ... from "x"`, `export ... from "x"`, side-effect `import "x"`, and literal
# dynamic `import("x")`. Good enough for tsc's ES module output and the pages' own scripts.
SPEC_RE = re.compile(
    r'(?:\bimport|\bexport)\s[^;"\']*?\bfrom\s*["\']([^"\']+)["\']'
    r'|\bimport\s*["\']([^"\']+)["\']'
    r'|\bimport\(\s*["\']([^"\']+)["\']\s*\)'
)
# Block and line comments, so an import shown in a doc comment isn't treated as a real one.
COMMENT_RE = re.compile(r"/\*.*?\*/|(?<![:\"'])//[^\n]*", re.DOTALL)


def specifiers(source):
    source = COMMENT_RE.sub("", source)
    for m in SPEC_RE.finditer(source):
        yield next(g for g in m.groups() if g)


def is_bare(spec):
    return not (spec.startswith((".", "/")) or re.match(r"^[a-z]+:", spec))


def resolve(spec, imports):
    """The map's target for a bare specifier, exact match first, then the longest "prefix/" key."""
    if spec in imports:
        return imports[spec]
    prefixes = [k for k in imports if k.endswith("/") and spec.startswith(k)]
    if not prefixes:
        return None
    key = max(prefixes, key=len)
    return imports[key] + spec[len(key):]


def walk(page_path):
    """Returns (missing, visited): bare specifiers with no map entry, and local files read."""
    html = open(page_path, encoding="utf-8").read()
    m = IMPORTMAP_RE.search(html)
    if not m:
        return [], 0
    imports = json.loads(m.group(1))["imports"]
    page_dir = os.path.dirname(page_path)
    missing = []
    seen = set()
    queue = [(spec, "<inline module script>", page_dir) for s in MODULE_SCRIPT_RE.findall(html) for spec in specifiers(s)]
    while queue:
        spec, importer, base = queue.pop()
        if is_bare(spec):
            target = resolve(spec, imports)
            if target is None:
                missing.append(f"{spec!r} (imported by {importer})")
                continue
            if re.match(r"^[a-z]+:", target):
                continue  # a CDN URL (lit, d3): its own graph is the CDN's business
            path = os.path.normpath(os.path.join(page_dir, target))
        elif spec.startswith("."):
            path = os.path.normpath(os.path.join(base, spec))
        else:
            continue
        if path in seen:
            continue
        seen.add(path)
        if not os.path.exists(path):
            missing.append(f"{spec!r} -> {os.path.relpath(path, ROOT)} does not exist (imported by {importer})")
            continue
        rel = os.path.relpath(path, ROOT)
        for child in specifiers(open(path, encoding="utf-8").read()):
            queue.append((child, rel, os.path.dirname(path)))
    return missing, len(seen)


class PlaygroundImportMaps(unittest.TestCase):
    def test_every_reachable_bare_specifier_is_mapped(self):
        if not glob.glob(os.path.join(ROOT, "packages", "*", "dist", "index.js")):
            self.skipTest("no packages/*/dist built yet; run `npm run build` first")
        pages = sorted(glob.glob(os.path.join(PLAYGROUND, "*.html")))
        self.assertTrue(pages, "no playground pages found")
        checked = 0
        for page in pages:
            with self.subTest(page=os.path.basename(page)):
                missing, visited = walk(page)
                if visited:
                    checked += 1
                self.assertEqual(missing, [], f"{os.path.basename(page)}: unmapped imports:\n  " + "\n  ".join(missing))
        self.assertGreater(checked, 0, "no page with an import map was actually walked")


if __name__ == "__main__":
    unittest.main()
