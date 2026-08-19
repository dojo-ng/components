"""
gencem.py — generate custom-elements.json (CEM 2.0) for the Dojo NG monorepo.

Run from components/:  python3 gencem.py
Output:               custom-elements.json

The output is a valid Custom Elements Manifest v2.0.0
(https://github.com/webcomponents/custom-elements-manifest)
so IDEs, Storybook, and framework-wrapper generators can consume it.

Source extraction lives in genlib.py (shared with gendocs.py / genreadmes.py).
Regenerate any time source changes; do not hand-edit the JSON.
"""

import json
import os

import genlib as G

OUT = "custom-elements.json"


def build_cem():
    # FOSS-only, deliberately: custom-elements.json ships in the npm package, and O6's leak
    # gate asserts it stays byte-identical whether the enterprise overlay is checked out
    # alongside or not.
    pkgs = sorted(d for d in os.listdir(G.FOSS_ROOT) if os.path.isdir(f"{G.FOSS_ROOT}/{d}/src"))
    modules = []

    for pkg in pkgs:
        for path, s in G.component_files(pkg):
            cls = G.class_name(s)
            if not cls:
                continue

            tag = G.tag_for_class(pkg, cls)
            doc = G.classdoc(s)

            # Properties → members + attributes
            members, attributes = [], []
            for p in G.parse_props(s):
                m_entry = {"kind": "field", "name": p["name"], "type": {"text": p["type"]}}
                if p["default"]:
                    m_entry["default"] = p["default"]
                if p["description"]:
                    m_entry["description"] = p["description"]
                if p["attr"]:
                    m_entry["attribute"] = p["attr"]
                    if p["reflects"]:
                        m_entry["reflects"] = True
                members.append(m_entry)

                if p["attr"]:
                    a_entry = {
                        "name": p["attr"],
                        "type": {"text": p["type"]},
                        "fieldName": p["name"],
                    }
                    if p["description"]:
                        a_entry["description"] = p["description"]
                    attributes.append(a_entry)

            # Public methods → method members (after the field members).
            members.extend(G.parse_methods(s))

            decl = {
                "kind": "class",
                "name": cls,
                "customElement": True,
                "tagName": tag,
                "description": G.description(doc, tag),
                "superclass": {"name": G.superclass(s)},
                "members": members,
                "attributes": attributes,
            }

            slots = G.parse_slots(doc, s)
            if slots:
                decl["slots"] = slots

            parts = G.parse_parts(doc, s)
            if parts:
                decl["cssParts"] = parts

            cssprops = G.parse_cssprops(doc)
            if cssprops:
                decl["cssProperties"] = cssprops

            evts = G.parse_events(doc, s)
            if evts:
                decl["events"] = [
                    {
                        "name": e["name"],
                        "type": {"text": "CustomEvent"},
                        "description": e["description"],
                    }
                    for e in evts
                ]

            modules.append(
                {
                    "kind": "javascript-module",
                    "path": path,
                    "declarations": [decl],
                    "exports": [
                        {
                            "kind": "custom-element-definition",
                            "name": tag,
                            "declaration": {"name": cls, "module": path},
                        }
                    ],
                }
            )

    cem = {"schemaVersion": "2.0.0", "readme": "", "modules": modules}
    with open(OUT, "w") as f:
        json.dump(cem, f, indent=2)
    print(f"CEM: {len(modules)} elements → {OUT}")


if __name__ == "__main__":
    build_cem()
