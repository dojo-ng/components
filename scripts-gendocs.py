import re, os, glob

PKGS="packages"
GROUPS=[
 ("Form controls",["button","action-button","floating-action-button","label","helper-text","text-input","email-input","number-input","password-input","constrained-input","text-area","native-select","select","typeahead","chip-typeahead","checkbox","checkbox-group","radio","radio-group","switch","slider","range-slider","rate","date-input","time-picker","form"]),
 ("Overlays",["popup","trigger-popup","context-popup","popup-confirmation","context-menu","dialog","slide-pane","tooltip","snackbar"]),
 ("Layout",["card","header-card","stack","two-column-layout","three-column-layout","title-pane","accordion"]),
 ("Navigation",["breadcrumb-group","header","pagination","tab-container","wizard","speed-dial","tree"]),
 ("Data display",["list","grid","calendar","avatar","chip","icon","result","text"]),
 ("Feedback",["progress","loading-indicator","global-event"]),
]
def main_file(pkg):
    d=f"{PKGS}/{pkg}/src"
    for f in [x for x in glob.glob(d+"/*.ts") if not x.endswith("index.ts") and not x.endswith(".styles.ts")]:
        s=open(f).read()
        if re.search(r"export class Dj",s): return s
    return ""
def tag_of(pkg):
    idx=f"{PKGS}/{pkg}/src/index.ts"
    if os.path.exists(idx):
        m=re.search(r'\.define\(\s*"([^"]+)"',open(idx).read())
        if m: return m.group(1)
    return "dj-"+pkg
def classdoc(s):
    m=re.search(r"/\*\*(.*?)\*/\s*export class Dj",s,re.S)
    if not m: return ""
    return "\n".join(re.sub(r"^\s*\*\s?","",ln).rstrip() for ln in m.group(1).splitlines()).strip()
def desc_of(doc,tag):
    cut=re.split(r"\n\s*(?:Slots?:|Parts?:|Events?:)",doc)[0]
    t=" ".join(cut.split()).strip()
    t=re.sub(rf"^`?<{re.escape(tag)}>`?\s*[—-]\s*","",t)
    return t[0].upper()+t[1:] if t else t
def marker(doc,name):
    m=re.search(rf"{name}\s*(.*?)(?=(?:Slots?:|Parts?:|Events?:)|\Z)",doc,re.S)
    if not m: return ""
    return " ".join(m.group(1).split()).strip()
PROP=re.compile(r'@property\(([^)]*)\)\s*(?:override\s+)?["\']?([A-Za-z0-9_]+)["\']?\s*[?!]?\s*(?::\s*([^=;]+?))?\s*(?:=\s*([^;]+))?\s*;')
def infer(typ,default):
    typ=(typ or "").strip()
    if typ: return typ
    d=(default or "").strip()
    if d in ("true","false"): return "boolean"
    if re.match(r'^["\']',d): return "string"
    if re.match(r'^-?\d',d): return "number"
    if d.startswith("[") : return "array"
    return "boolean"
def props(s):
    out=[]
    for m in PROP.finditer(s):
        opts,name,typ,default=m.groups()
        attr=name
        am=re.search(r'attribute:\s*"([^"]+)"',opts)
        if am: attr=am.group(1)
        elif re.search(r'attribute:\s*false',opts): attr=None
        else: attr=re.sub(r'([a-z0-9])([A-Z])',r'\1-\2',name).lower()
        out.append((name,attr,infer(typ,default),(default or "").strip(),"reflect: true" in opts))
    return out

o=["# Dojo NG component reference\n",
"First-pass API reference for the 60 Dojo NG web components, generated from source. For conventions (naming, `--dj-*` theming tokens, events, the WCAG 2.2 AA / mobile requirements) see `component-conventions.md`; for theming see `theming-proposal.md`; for state/data see `state-and-framework-analysis.md`.\n",
"Usage: import a package to register its tag, then use it. Example:\n",
"```html\n<script type=\"module\">import \"@dojo-ng/button\";</script>\n<dj-button kind=\"outlined\">Save</dj-button>\n```\n",
"In the property tables, **Attribute** is the HTML attribute name (↻ = reflected to the DOM); a dash means the property is set in JavaScript only. Components also expose CSS `part`s for `::part()` styling.\n"]
seen=set()
for g,names in GROUPS:
    o.append(f"\n## {g}\n")
    for pkg in names:
        if not os.path.isdir(f"{PKGS}/{pkg}/src"): continue
        seen.add(pkg); s=main_file(pkg)
        if not s: continue
        tag=tag_of(pkg); doc=classdoc(s)
        o.append(f"\n### `<{tag}>` · `@dojo-ng/{pkg}`\n")
        ext=re.search(r"export class Dj\w+ extends (Dj\w+)",s)
        if ext: o.append(f"*Extends `{ext.group(1)}`; inherits its properties and behavior.*\n")
        d=desc_of(re.sub(r"`","",doc),tag)
        if d: o.append(d+"\n")
        ps=props(s)
        if ps:
            o.append("| Property | Attribute | Type | Default |")
            o.append("|---|---|---|---|")
            for name,attr,typ,default,refl in ps:
                a=(attr or "—")+(" ↻" if refl else "")
                tcell=typ.replace("|"," \\| ")
                dcell=("`"+default+"`") if default else "—"
                o.append(f"| `{name}` | {a} | `{tcell}` | {dcell} |")
            o.append("")
        for label,key in (("Slots","Slots?:"),("Parts","Parts?:"),("Events","Events?:")):
            v=marker(doc,key)
            if v: o.append(f"**{label}:** {v}\n")
o.append("\n## Utilities and infrastructure\n")
o.append("Not custom elements (except `<dj-theme>`); these support theming and app-level state.\n")
o.append("- **`@dojo-ng/dojo-element`** — `DojoElement`, the Lit base class every component extends (typed `emit()`, idempotent `define()`, auto-registered `dependencies`); plus the `DojoFormControl` interface and shared `baseStyles`.")
o.append("- **`@dojo-ng/theme`** — `theme.css` (the `--dj-*` token layers, light/dark/OS) and `<dj-theme theme=\"light|dark|auto\">` for scoped theming.")
o.append("- **`@dojo-ng/store`** — `createStore` (Zustand vanilla) and `StoreController`, a Lit reactive controller that re-renders a host on a selected store slice.")
o.append("- **`@dojo-ng/context`** — the typed context-key registry (`storeContext`, `localeContext`) plus the `@lit/context` provider/consumer primitives.")
o.append("- **`@dojo-ng/pubsub`** — `createPubSub()`: a publish/subscribe facade backed by the store (last value retained + replayed to late subscribers).")
md="\n".join(o)
open("/tmp/components-reference.md","w").write(md)
print("documented:",len(seen),"chars:",len(md))
