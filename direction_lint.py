"""
direction_lint.py — Track O's dependency-direction linter (enterprise-export-phase2-spec.md O6).

No file under `packages/` may import or declare a dependency on the `@dojo-ng-pro` scope: the
writers and plugins in the enterprise overlay depend on `@dojo-ng/export-core` and friends, never
the reverse (see `enterprise-export-phase2-spec.md`, "Two things to know before starting"). A
FOSS package that picked up a `@dojo-ng-pro` import would be unbuildable for a public-only clone,
so this is a real build-breaking check, not just a policy one.

Runs in the public lint (`npm run lint`) and needs no overlay present — it is a pure source-tree
check against `packages/` alone.

A SCOPE match, not a name-pattern guess: this looks for the literal `@dojo-ng-pro/` prefix, never
a substring like "pro" or "enterprise" that a legitimately-named FOSS package could contain.

Usage: python3 direction_lint.py
Exits non-zero, printing every violation, if anything under packages/ references @dojo-ng-pro.
"""

import glob
import json
import re
import sys

FOSS_ROOT = "packages"
SCOPE = "@dojo-ng-pro"

# `from "@dojo-ng-pro/x"`, `require("@dojo-ng-pro/x")`, `import("@dojo-ng-pro/x")` — the three
# forms a bare-specifier reference to the scope can take in a .ts source file. The spec string
# always sits on one line even when the surrounding import's named-binding list spans several.
_IMPORT_RE = re.compile(
    r'''from\s+["'](@dojo-ng-pro/[^"']+)["']'''
    r'''|require\(\s*["'](@dojo-ng-pro/[^"']+)["']\s*\)'''
    r'''|import\(\s*["'](@dojo-ng-pro/[^"']+)["']\s*\)'''
)


def check():
    """[str] — one line per violation, or [] if packages/ is clean."""
    findings = []

    for path in sorted(glob.glob(f"{FOSS_ROOT}/*/src/*.ts")):
        with open(path, encoding="utf-8") as f:
            src = f.read()
        for i, line in enumerate(src.splitlines(), 1):
            for m in _IMPORT_RE.finditer(line):
                spec = next(g for g in m.groups() if g)
                findings.append(
                    f"{path}:{i}: imports `{spec}` — packages/ may never import the {SCOPE} scope"
                )

    for path in sorted(glob.glob(f"{FOSS_ROOT}/*/package.json")):
        with open(path, encoding="utf-8") as f:
            pkg = json.load(f)
        for field in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
            for name in pkg.get(field, {}):
                if name == SCOPE or name.startswith(SCOPE + "/"):
                    findings.append(
                        f"{path}: {field} declares `{name}` — packages/ may never depend on the {SCOPE} scope"
                    )

    return findings


if __name__ == "__main__":
    findings = check()
    for line in findings:
        print(line)
    if findings:
        print(f"direction lint: {len(findings)} violation(s)")
        sys.exit(1)
    print("direction lint: clean")
