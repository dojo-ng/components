"""
leak_gate.py — Track O's leak gate (enterprise-export-phase2-spec.md O6): proves the enterprise
overlay never reaches a public artifact. Three independent checks; any one can fail on its own.

  1. TWO-RUN ARTIFACT COMPARISON. Every generator that writes a public artifact —
     custom-elements.json (gencem.py), the consolidated doc (gendocs.py), types/ (gentypes.py),
     the skill catalog (gencatalog.py) — must produce byte-identical output whether a throwaway
     overlay package is present or not. This module builds and tears down its own throwaway
     fixture under enterprise/packages/ so the comparison actually exercises the overlay-aware
     code paths (O4) rather than comparing two empty-overlay runs, which would pass for the wrong
     reason no matter what those code paths did.

     Per ground-rules.md's "verifying honestly": an md5/byte comparison across two runs
     FALSE-PASSES when both runs fail identically, so every generator's exit code is checked and
     every artifact's existence is checked BEFORE any comparison runs.

  2. Direction linter (direction_lint.py) — no file under packages/ imports or depends on the
     @dojo-ng-pro scope.

  3. License linter (license_lint.py) — packages/ carries BSD-3-Clause, enterprise/packages/
     carries whatever enterprise/LICENSE says.

Usage: python3 leak_gate.py   (or `npm run leak-gate`)
Exits non-zero, printing which check failed and why, if anything is wrong. Tracked files this
script regenerates as a side effect of running the comparison (custom-elements.json, types/*,
the skill catalog) are restored to their original bytes before exit, success or failure.
"""

import glob
import json
import os
import shutil
import subprocess
import sys

import direction_lint
import license_lint

COMPONENTS = os.path.dirname(os.path.abspath(__file__))
SKILL_CATALOG = os.environ.get(
    "DJ_SKILL_CATALOG", os.path.join(COMPONENTS, "..", "skill", "dojo-ng", "references", "components.md")
)
DOC_REFERENCE = "docs/components-reference.md"

# (label, path) — the artifacts a "leak" would actually show up in. Paths relative to COMPONENTS
# except SKILL_CATALOG, which is relative-to-parent already (or absolute, via DJ_SKILL_CATALOG).
ARTIFACTS = [
    ("custom-elements.json", "custom-elements.json"),
    ("types/react.d.ts", "types/react.d.ts"),
    ("types/solid.d.ts", "types/solid.d.ts"),
    ("types/vue.d.ts", "types/vue.d.ts"),
    ("types/dojo.d.ts", "types/dojo.d.ts"),
    ("docs (components-reference.md)", DOC_REFERENCE),
    ("skill catalog", SKILL_CATALOG),
]

GENERATORS = ["gencem.py", "gendocs.py", "gentypes.py", "gencatalog.py"]

FIXTURE_PKG = "leak-check-widget"
FIXTURE_DIR = os.path.join(COMPONENTS, "enterprise", "packages", FIXTURE_PKG)
FIXTURE_DOC_GROUPS = os.path.join(COMPONENTS, "enterprise", "tests", "doc_groups.py")
FIXTURE_README_CONTENT = os.path.join(COMPONENTS, "enterprise", "tests", "readme_content.py")


def _abspath(path):
    return path if os.path.isabs(path) else os.path.join(COMPONENTS, path)


def _run_generator(script):
    r = subprocess.run(
        [sys.executable, script], cwd=COMPONENTS, capture_output=True, text=True
    )
    if r.returncode != 0:
        raise RuntimeError(f"{script} exited {r.returncode}\nstdout: {r.stdout}\nstderr: {r.stderr}")


def _generate_all():
    for script in GENERATORS:
        _run_generator(script)


def _read_artifacts():
    """{label: bytes} for every ARTIFACTS entry — raises if a generator claimed success (exit 0)
    but the file it was supposed to write doesn't exist, the false-pass ground-rules.md warns
    about."""
    out = {}
    for label, path in ARTIFACTS:
        full = _abspath(path)
        if not os.path.exists(full):
            raise RuntimeError(f"missing artifact after generation: {label} ({full})")
        with open(full, "rb") as f:
            out[label] = f.read()
    return out


def _make_fixture():
    """A throwaway overlay component — real enough to actually exercise the overlay-aware code
    paths in genlib/gendocs/genreadmes (a registered custom element, a GROUPS entry, NOTES/
    EXAMPLES entries), so the comparison below is a discriminating test rather than one that
    passes because there was nothing for it to fail on."""
    os.makedirs(os.path.join(FIXTURE_DIR, "src"), exist_ok=True)
    with open(os.path.join(FIXTURE_DIR, "package.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "name": f"@dojo-ng-pro/{FIXTURE_PKG}",
                "version": "0.0.0",
                "license": "SEE LICENSE IN ../../LICENSE",
                "description": "THROWAWAY fixture created by leak_gate.py's two-run comparison.",
            },
            f,
            indent=2,
        )
    with open(os.path.join(FIXTURE_DIR, "src", "dj-leak-check-widget.ts"), "w", encoding="utf-8") as f:
        f.write(
            "/**\n"
            " * A throwaway overlay component. If this name ever appears in a public\n"
            " * artifact, the leak gate has failed.\n"
            " *\n"
            " * Slots: (default): the throwaway content.\n"
            " */\n"
            "export class DjLeakCheckWidget {\n"
            '  @property() label = "leak";\n'
            "}\n"
        )
    with open(os.path.join(FIXTURE_DIR, "src", "index.ts"), "w", encoding="utf-8") as f:
        f.write('DjLeakCheckWidget.define("dj-leak-check-widget", DjLeakCheckWidget);\n')

    os.makedirs(os.path.dirname(FIXTURE_DOC_GROUPS), exist_ok=True)
    with open(FIXTURE_DOC_GROUPS, "w", encoding="utf-8") as f:
        f.write('GROUPS = [("Leak check (throwaway)", ["leak-check-widget"])]\n')
    with open(FIXTURE_README_CONTENT, "w", encoding="utf-8") as f:
        f.write(
            'NOTES = {"leak-check-widget": "Throwaway leak-check note."}\n'
            'EXAMPLES = {"leak-check-widget": '
            '[("Throwaway", "Throwaway desc.", "<dj-leak-check-widget></dj-leak-check-widget>")]}\n'
        )


def _remove_fixture():
    shutil.rmtree(FIXTURE_DIR, ignore_errors=True)
    for f in (FIXTURE_DOC_GROUPS, FIXTURE_README_CONTENT):
        if os.path.exists(f):
            os.remove(f)
    # genreadmes.py would have written this package's own README under the fixture dir, which
    # rmtree above already removed along with the rest of FIXTURE_DIR.


def two_run_comparison():
    """[str] — one finding per artifact that differs with the overlay present, or [] if all
    stay byte-identical. Restores every tracked artifact this touches to its original bytes
    before returning, success or failure."""
    tracked = list(ARTIFACTS)
    originals = {}
    for label, path in tracked:
        full = _abspath(path)
        originals[path] = open(full, "rb").read() if os.path.exists(full) else None

    try:
        _generate_all()
        without_overlay = _read_artifacts()

        _make_fixture()
        try:
            _generate_all()
            with_overlay = _read_artifacts()
        finally:
            _remove_fixture()

        findings = []
        for label, _ in ARTIFACTS:
            if without_overlay[label] != with_overlay[label]:
                findings.append(f"{label}: differs depending on whether the overlay is present")
        return findings
    finally:
        for label, path in tracked:
            full = _abspath(path)
            content = originals[path]
            if content is not None:
                with open(full, "wb") as f:
                    f.write(content)


def main():
    ok = True

    print("== two-run artifact comparison ==")
    findings = two_run_comparison()
    for line in findings:
        print(line)
    if findings:
        print(f"FAIL: {len(findings)} artifact(s) leak overlay content")
        ok = False
    else:
        print("clean: all artifacts byte-identical with and without the overlay")

    print("== direction lint ==")
    findings = direction_lint.check()
    for line in findings:
        print(line)
    if findings:
        print(f"FAIL: {len(findings)} direction violation(s)")
        ok = False
    else:
        print("clean")

    print("== license lint ==")
    findings = license_lint.check()
    for line in findings:
        print(line)
    if findings:
        print(f"FAIL: {len(findings)} license violation(s)")
        ok = False
    else:
        print("clean")

    if not ok:
        print("leak gate: FAILED")
        sys.exit(1)
    print("leak gate: all clear")


if __name__ == "__main__":
    main()
