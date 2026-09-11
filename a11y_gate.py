"""a11y_gate.py — Track A1 of component-a11y-coverage-spec.md: make accessibility coverage
measurable and non-regressable, in the style of leak_gate.py and check_drift.py.

WHAT COUNTS AS COVERED. A package is covered when a test file that calls `assertNoViolations`
mentions one of the package's tags. This is the third rule tried, kept because the first two both
lie:

  - Matching `packages/<name>/dist` imports OVER-counts: presentational.test.js imports 17
    packages and axe-runs a subset of them.
  - The same rule also UNDER-counts: radio.test.js exercises <dj-radio> without importing that
    package's own dist, and context-popup is exercised from context-menu.test.js.
  - Matching only make("dj-x") MISSES the table-driven cases, written { tag: "dj-x" } in a CASES
    array.

`site/tools/gencomponents.py`'s `axe_coverage()` already implements this rule for the public
gallery page; this module is the same logic, copied rather than reinvented, so the gate and the
public claim cannot silently diverge.

COUNT ONLY FILES THE DEFAULT SUITE RUNS. The `"!tests/browser/..."` exclusions are read out of
web-test-runner.config.mjs rather than listed here, so the two cannot drift. Not hypothetical:
adding tests/browser/video-real.test.js pushed the raw coverage figure from 66 to 67 the instant
the file existed, because it calls assertNoViolations and names dj-video while never running in
CI. A test excluded from the per-commit run proves nothing about what CI enforces.

THE RATCHET. EXEMPT holds packages that can never be meaningfully audited (global-event: renders
nothing). KNOWN_GAPS holds the current, named backlog -- every entry has a one-line reason. A
THIRD state, OPT_IN_COVERAGE, holds a package that IS genuinely audited, but only by a test
deliberately excluded from the default suite (video: tests/browser/video-real.test.js, gated
behind DJ_REAL_VIDEO because it loads the real video.js engine) -- neither silently covered by the
default suite nor an open gap, so it gets neither's bookkeeping: it does not count toward
`covered`, but it is not a finding either, and it is not something a KNOWN_GAPS entry's staleness
check would ever clear (the opt-in test is permanently excluded from the default run by design, so
it can never become "covered by the blob"). The gate fails on two conditions, not one:

  1. An element package is uncovered and in NONE of the three sets -- a NEW regression: someone
     shipped a component with no axe coverage and no allowlist entry explaining why.
  2. A KNOWN_GAPS entry is now actually covered -- a STALE allowlist entry, which is how a ratchet
     quietly stops ratcheting. Per ground-rules.md's "verifying honestly", a gate that can only
     ever report a gap and never report progress is not proving the backlog is shrinking.

Usage: python3 a11y_gate.py   (or `npm run a11y-gate`)
Exits non-zero, printing every finding, if anything is wrong.
"""

import os
import re
import sys

import genlib as G

TESTS_DIR = "tests/browser"
CONFIG = "web-test-runner.config.mjs"

EXEMPT = {
    "global-event": "non-visual; attaches window/document listeners and renders nothing to audit",
}

# Covered, but deliberately not by the default suite -- see the THIRD STATE note above. A1's
# snapshot listed `video` as a KNOWN_GAPS entry ("built 2026-09-10, opt-in real-engine run,
# unrun"); A2 ran it (`DJ_REAL_VIDEO=1 npx web-test-runner tests/browser/video-real.test.js`,
# 2026-09-10) -- 12/12 across Chromium/Firefox/WebKit, 0 serious/critical AND 0 moderate/minor axe
# findings (a11y.js logs moderate/minor via console.warn regardless of pass/fail; none printed).
# So it moves here, not into a clean bill of health in KNOWN_GAPS.
OPT_IN_COVERAGE = {
    "video": "audited by tests/browser/video-real.test.js against the real video.js engine, "
             "excluded from the default suite by design (npm run test:video:real) -- spec Track A2",
}

# component-a11y-coverage-spec.md's 14-package snapshot, 2026-09-10, is now fully covered: `video`
# moved to OPT_IN_COVERAGE (A2), the seven presentational packages landed in
# tests/browser/presentational.test.js (A3), and the six interactive packages below each got their
# own file (A4) -- copy-button, dropdown, search-box, split-panel, speed-dial, grid. Empty by
# design: the next entry here is a real regression, not a snapshot backlog item.
KNOWN_GAPS = {}


def excluded_test_files():
    """Test-file basenames the DEFAULT web-test-runner run does not execute, read from the
    runner config's own `files` exclusion list -- see the module docstring."""
    excluded = set()
    if os.path.exists(CONFIG):
        with open(CONFIG) as fh:
            for m in re.finditer(r'"!tests/browser/([\w.-]+)"', fh.read()):
                excluded.add(m.group(1))
    return excluded


def element_packages():
    """{pkg_name: [tags]} for every package with at least one `export class Dj...` source file.
    Uses genlib.component_files (the element-ness test) and genlib.tag_for_class, NOT
    genlib.tag_of(), which falls back to "dj-<pkg>" and so invents a tag for a package that
    registers no element at all (store, dnd)."""
    out = {}
    for name in sorted(os.listdir("packages")):
        manifest = os.path.join("packages", name, "package.json")
        if not os.path.exists(manifest):
            continue  # build residue (e.g. export-core), not a package
        files = G.component_files(name)
        if not files:
            continue  # no export class Dj... -- not an element package
        tags = []
        for _, src in files:
            cls = G.class_name(src)
            if cls:
                tags.append(G.tag_for_class(name, cls))
        if tags:
            out[name] = tags
    return out


def axe_running_blob():
    """Concatenated source of every DEFAULT-suite test file that calls assertNoViolations."""
    excluded = excluded_test_files()
    blob = []
    for name in sorted(os.listdir(TESTS_DIR)):
        if not name.endswith(".js") or name == "a11y.js" or name in excluded:
            continue
        with open(os.path.join(TESTS_DIR, name)) as fh:
            src = fh.read()
        if "assertNoViolations" in src:
            blob.append(src)
    return "\n".join(blob)


def covered_packages(packages, blob):
    """{pkg_name, ...} whose tag is mentioned (quoted, or as an opening tag) anywhere in `blob`."""
    covered = set()
    for name, tags in packages.items():
        if any(re.search(r'["\'<]%s[^a-z-]' % re.escape(t), blob) for t in tags):
            covered.add(name)
    return covered


def check(packages=None, blob=None):
    """[str] findings, or [] if the gate is clean. Kept separate from main() so a test can call
    it directly with a substituted KNOWN_GAPS/EXEMPT without shelling out."""
    if packages is None:
        packages = element_packages()
    if blob is None:
        blob = axe_running_blob()
    covered = covered_packages(packages, blob)

    findings = []

    uncovered = sorted(set(packages) - covered)
    for p in uncovered:
        if p not in EXEMPT and p not in KNOWN_GAPS and p not in OPT_IN_COVERAGE:
            findings.append(f"UNCOVERED, not exempt, not a known gap, not opt-in-covered: {p}")

    for p in sorted(KNOWN_GAPS):
        if p in covered:
            findings.append(f"STALE KNOWN_GAPS entry (now covered — remove it): {p}")

    return findings, packages, covered


def main():
    findings, packages, covered = check()

    total = len(packages)
    checked = len(covered)
    print(f"a11y_gate: {checked} of {total} element packages covered by the default browser suite")
    print(f"  exempt ({len(EXEMPT)}): {sorted(EXEMPT)}")
    print(f"  opt-in covered ({len(OPT_IN_COVERAGE)}): {sorted(OPT_IN_COVERAGE)}")
    print(f"  known gaps ({len(KNOWN_GAPS)}): {sorted(KNOWN_GAPS)}")

    if findings:
        print("a11y_gate: FAILED")
        for f in findings:
            print(f"  - {f}")
        sys.exit(1)

    print("a11y_gate: clear")


if __name__ == "__main__":
    main()
