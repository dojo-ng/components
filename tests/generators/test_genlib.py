"""
Tests for the doc/manifest generators (review task 4.2).

genlib.py parses TypeScript with regexes and feeds gencem/gentypes/gendocs/
genreadmes — load-bearing, and it has silently corrupted output before (the
@cssprop bracket-default-with-var() truncation). These lock the parse behavior
against a fixture component and check that gencem is deterministic.

Run:  python3 -m unittest discover -s tests/generators -p "test_*.py"
(from components/), or via `npm run test:generators`.
"""

import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
COMPONENTS = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, COMPONENTS)

import genlib  # noqa: E402

with open(os.path.join(HERE, "fixtures", "dj-fixture.ts")) as _f:
    FIXTURE = _f.read()
DOC = genlib.classdoc(FIXTURE)


def _read_bytes(path):
    with open(path, "rb") as f:
        return f.read()


class ParseProps(unittest.TestCase):
    def test_props(self):
        props = genlib.parse_props(FIXTURE)
        by = {p["name"]: p for p in props}
        self.assertEqual([p["name"] for p in props], ["count", "open", "label"])
        # default → inferred type; attribute name defaults to the kebab of the prop.
        self.assertEqual((by["count"]["type"], by["count"]["default"], by["count"]["attr"], by["count"]["reflects"]),
                         ("number", "3", "count", False))
        # explicit attribute name + reflect.
        self.assertEqual((by["open"]["type"], by["open"]["attr"], by["open"]["reflects"]),
                         ("boolean", "is-open", True))
        # typed, no default.
        self.assertEqual((by["label"]["type"], by["label"]["attr"]), ("string", "label"))


class ParseCssProps(unittest.TestCase):
    def test_var_default_not_truncated(self):
        css = genlib.parse_cssprops(DOC)
        by = {c["name"]: c for c in css}
        self.assertIn("--dj-fixture-color", by)
        # The regression: a var() default inside [--name=…] must survive whole.
        self.assertEqual(by["--dj-fixture-color"]["default"], "var(--dj-fallback-color)")
        self.assertEqual(by["--dj-fixture-color"]["description"], "Text color.")
        # Bare form: no default, description carried.
        self.assertNotIn("default", by["--dj-fixture-gap"])
        self.assertEqual(by["--dj-fixture-gap"]["description"], "Gap between items.")


class ParseSlotsParts(unittest.TestCase):
    def test_slots_merge_doc_and_template(self):
        slots = genlib.parse_slots(DOC, FIXTURE)
        self.assertEqual([s["name"] for s in slots], ["title", ""])
        self.assertEqual({s["name"]: s["description"] for s in slots}[""], "main content")

    def test_parts_template_adds_undocumented(self):
        parts = genlib.parse_parts(DOC, FIXTURE)
        self.assertEqual([p["name"] for p in parts], ["control", "label", "extra"])
        self.assertEqual(parts[0]["description"], "the box")  # from JSDoc
        self.assertEqual(parts[2]["description"], "")  # "extra" only in the template


class ParseEventsMethods(unittest.TestCase):
    def test_events(self):
        self.assertEqual(
            genlib.parse_events(DOC, FIXTURE),
            [{"name": "dj-change", "description": "fired when the value changes"}],
        )

    def test_methods_excludes_private_and_render(self):
        methods = genlib.parse_methods(FIXTURE)
        self.assertEqual([m["name"] for m in methods], ["reset"])  # not internalHelper/change/render
        self.assertEqual(methods[0]["description"], "Reset the widget to its defaults.")
        self.assertEqual(methods[0]["parameters"], [{"name": "options", "type": {"text": "FocusOptions"}}])


class GencemDeterminism(unittest.TestCase):
    def test_gencem_is_byte_identical_across_runs(self):
        cem = os.path.join(COMPONENTS, "custom-elements.json")
        original = _read_bytes(cem) if os.path.exists(cem) else None

        def run():
            subprocess.run([sys.executable, "gencem.py"], cwd=COMPONENTS, check=True, capture_output=True)
            return _read_bytes(cem)

        try:
            first = run()
            second = run()
            self.assertEqual(first, second, "gencem.py output must be deterministic")
        finally:
            # Leave the committed manifest exactly as it was, regardless of outcome.
            if original is not None:
                with open(cem, "wb") as f:
                    f.write(original)


if __name__ == "__main__":
    unittest.main()
