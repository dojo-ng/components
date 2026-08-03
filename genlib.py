"""
genlib.py — shared source extraction for the Dojo NG generators.

One source of truth for how a component's tag, description, properties, slots,
parts, and events are read from the TypeScript source. Consumed by:
  - gencem.py      → custom-elements.json (CEM 2.0)
  - gendocs.py     → components-reference.md
  - genreadmes.py  → per-package README.md

Extraction returns plain data (dicts/lists); each generator formats it for its
own output. Slots and parts come from the rendered templates (the source of
truth for what exists) unioned with any JSDoc prose descriptions.
"""

import glob
import os
import re

PKGS = "packages"


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------


def main_file(pkg):
    """Return (relative-path, source) for a package's primary class file."""
    for f in sorted(glob.glob(f"{PKGS}/{pkg}/src/*.ts")):
        if f.endswith("index.ts") or f.endswith(".styles.ts"):
            continue
        s = open(f).read()
        if re.search(r"export class Dj", s):
            return f, s
    return None, ""


def tag_of(pkg):
    """The registered tag name, read from the package's index.ts define() call."""
    idx = f"{PKGS}/{pkg}/src/index.ts"
    if os.path.exists(idx):
        m = re.search(r'\.define\(\s*"([^"]+)"', open(idx).read())
        if m:
            return m.group(1)
    return "dj-" + pkg


def class_name(s):
    m = re.search(r"export class (Dj\w+)", s)
    return m.group(1) if m else ""


def superclass(s):
    m = re.search(r"export class Dj\w+ extends (Dj\w+)", s)
    return m.group(1) if m else "DojoElement"


# ---------------------------------------------------------------------------
# JSDoc helpers
# ---------------------------------------------------------------------------

ANY_DOC = re.compile(r"/\*\*(.*?)\*/", re.S)


def classdoc(s):
    """The class-level JSDoc body (star prefixes stripped), or ''."""
    # Tempered body — (?!\*/) stops the match spanning across an earlier comment's
    # closing */, so a JSDoc-commented helper before the class (e.g. a formatTime
    # utility) is not swallowed into the class doc; grab only the block adjacent to it.
    m = re.search(r"/\*\*((?:(?!\*/).)*)\*/\s*export class Dj", s, re.S)
    if not m:
        return ""
    lines = [re.sub(r"^\s*\*\s?", "", ln).rstrip() for ln in m.group(1).splitlines()]
    return "\n".join(lines).strip()


def clean_jsdoc(raw):
    """Strip * prefixes from a JSDoc body and collapse to a single line."""
    lines = [re.sub(r"^\s*\*\s?", "", ln).rstrip() for ln in raw.splitlines()]
    return " ".join(" ".join(lines).split()).strip()


def description(doc, tag):
    """The lead description: class JSDoc up to the first Slots/Parts/Events/Methods
    section, with a leading `<tag> —` prefix removed."""
    cut = re.split(r"\n\s*(?:Slots?:|Parts?:|Events?:|Methods?:)", doc)[0]
    t = " ".join(cut.split()).strip()
    return re.sub(rf"^`?<{re.escape(tag)}>`?\s*[—\-–]\s*", "", t).strip()


def _section(doc, keyword):
    """Raw text of a named section in the class JSDoc."""
    m = re.search(rf"{keyword}:(.*?)(?=(?:Slots?|Parts?|Events?|Methods?):|\Z)", doc, re.S)
    return m.group(1).strip() if m else ""


# ---------------------------------------------------------------------------
# Properties
# ---------------------------------------------------------------------------

PROP = re.compile(
    r"@property\(([^)]*)\)\s*(?:override\s+)?(?:readonly\s+)?"
    r'["\']?([A-Za-z0-9_]+)["\']?([^;]*);'
)


def split_type_default(rest):
    rest = rest.strip()
    if rest[:1] in "?!":
        rest = rest[1:].strip()
    # find an assignment '=' that is not part of '=>', '==', '<=', '>=', '!='
    idx = -1
    for i, ch in enumerate(rest):
        if (
            ch == "="
            and (i + 1 >= len(rest) or rest[i + 1] not in "=>")
            and (i == 0 or rest[i - 1] not in "=<>!")
        ):
            idx = i
    left = (rest if idx < 0 else rest[:idx]).strip()
    default = rest[idx + 1 :].strip() if idx >= 0 else ""
    typ = left[1:].strip() if left.startswith(":") else ""
    return typ, default


def infer_type(typ, default):
    if typ:
        return typ
    d = default.strip()
    if d in ("true", "false"):
        return "boolean"
    if d[:1] in "\"'":
        return "string"
    if re.match(r"^-?\d", d):
        return "number"
    if d.startswith("["):
        return "array"
    return "boolean"


def parse_props(s):
    """Each @property as a dict: name, attr (None = JS-only), type, default,
    reflects, description."""
    out = []
    for m in PROP.finditer(s):
        opts, name, rest = m.groups()

        # JSDoc immediately preceding the decorator (no ; or { in between).
        before = s[: m.start()]
        docs = list(ANY_DOC.finditer(before))
        dm = docs[-1] if docs else None
        if dm and re.search(r"[;{]", before[dm.end() :]):
            dm = None
        desc = clean_jsdoc(dm.group(1)) if dm else ""

        typ, default = split_type_default(rest)
        typ = infer_type(typ, default)

        am = re.search(r'attribute:\s*"([^"]+)"', opts)
        if am:
            attr = am.group(1)
        elif re.search(r"attribute:\s*false", opts):
            attr = None
        else:
            attr = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name).lower()

        out.append(
            dict(
                name=name,
                attr=attr,
                type=typ,
                default=default,
                reflects="reflect: true" in opts,
                description=desc,
            )
        )
    return out


# ---------------------------------------------------------------------------
# Slots / Parts / Events  (templates = source of truth; JSDoc adds prose)
# ---------------------------------------------------------------------------


def _slots_from_doc(doc):
    text = _section(doc, r"Slots?")
    if not text:
        return []

    # List format: "- (default): desc" or "- name: desc"
    list_items = re.findall(r"-\s+(\([^)]+\)|[^\s:,]+)\s*:\s*(.+)", text)
    if list_items:
        slots = []
        for raw_name, desc in list_items:
            name = "" if raw_name == "(default)" else raw_name.strip("`")
            slots.append({"name": name, "description": desc.strip()})
        return slots

    # Inline comma format: "`title`, default (content), `actions`". Stop at the
    # first period (end of the slot-list sentence); bail when prose starts.
    slots = []
    for token in re.split(r",\s*", text):
        token = token.split(".")[0].strip()
        if not token:
            continue
        p = re.match(r"^`?([A-Za-z0-9_-]+|\(default\))`?(?:\s*\(([^)]+)\))?$", token)
        if not p:
            break
        raw_name = p.group(1).strip()
        name = "" if raw_name.lower() in ("default", "(default)") else raw_name
        slots.append({"name": name, "description": (p.group(2) or "").strip()})
    return slots


def _parts_from_doc(doc):
    text = _section(doc, r"Parts?")
    if not text:
        return []
    parts = []
    for token in re.split(r",(?![^(]*\))", text):  # commas outside parens
        token = token.strip().rstrip(".")
        if not token:
            continue
        p = re.match(r"^`?([A-Za-z0-9_-]+)`?(?:\s*\(([^)]+)\))?", token)
        if p:
            parts.append(
                {"name": p.group(1), "description": (p.group(2) or "").strip()}
            )
    return parts


def _slots_from_template(s):
    """Slot names actually rendered: <slot name="x"> and bare <slot> (= default)."""
    names = []
    for tag in re.findall(r"<slot\b[^>]*>", s):
        nm = re.search(r'name=["\']([^"\']+)["\']', tag)
        names.append(nm.group(1) if nm else "")
    return list(dict.fromkeys(names))


def _parts_from_template(s):
    """Part names actually exposed: part="x" / part="x y" (static only)."""
    names = []
    for val in re.findall(r'part=["\']([^"\']+)["\']', s):
        names.extend(val.split())
    return list(dict.fromkeys(names))


def _merge_named(documented, rendered):
    """Union JSDoc-described entries (keep descriptions + order) with names found
    in the template (appended, description-less). The template is the source of
    truth for existence; the JSDoc only adds prose."""
    by_name = {d["name"]: d for d in documented}
    order = [d["name"] for d in documented]
    for n in rendered:
        if n not in by_name:
            by_name[n] = {"name": n, "description": ""}
            order.append(n)
    return [by_name[n] for n in order]


def parse_slots(doc, s):
    return _merge_named(_slots_from_doc(doc), _slots_from_template(s))


def parse_parts(doc, s):
    return _merge_named(_parts_from_doc(doc), _parts_from_template(s))


def parse_events(doc, s):
    """Event names from emit() calls; descriptions from the JSDoc Events section.
    Preserves declaration order; deduplicates."""
    names = list(dict.fromkeys(re.findall(r'emit\(\s*"([^"]+)"', s)))
    prose = _section(doc, r"Events?")
    events = []
    for name in names:
        dm = re.search(rf"`?{re.escape(name)}`?\s*\(([^)]+)\)", prose) or re.search(
            rf"`?{re.escape(name)}`?\s*:\s*([^.;,\n]+)", prose
        )
        events.append({"name": name, "description": dm.group(1).strip() if dm else ""})
    return events


# ---------------------------------------------------------------------------
# Public methods
# ---------------------------------------------------------------------------

# Lit / web-component lifecycle and form callbacks — real members, but not the
# consumer-facing API, so they stay out of the manifest's method list.
_METHOD_LIFECYCLE = {
    "constructor",
    "connectedCallback",
    "disconnectedCallback",
    "attributeChangedCallback",
    "adoptedCallback",
    "formAssociatedCallback",
    "formDisabledCallback",
    "formResetCallback",
    "formStateRestoreCallback",
    "render",
    "update",
    "updated",
    "firstUpdated",
    "willUpdate",
    "shouldUpdate",
    "performUpdate",
    "scheduleUpdate",
    "getUpdateComplete",
    "createRenderRoot",
    "requestUpdate",
}
# Control-flow / language keywords that look like a call at the start of a line.
_METHOD_KEYWORDS = {
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "return",
    "function",
    "else",
    "do",
    "get",
    "set",
    "super",
    "typeof",
    "await",
    "new",
    "case",
    "with",
}

# A method DEFINITION: optional modifiers, name, (params), optional :returnType,
# then an opening brace. The trailing `{` excludes call expressions (which end in
# `;` or `)`), and `[^={;]` on the return type excludes `name = (x) => {` fields.
_METHOD_RE = re.compile(
    r"^[ \t]*((?:public |private |protected |static |override |async )*)"
    r"([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*([^={;]+?))?\s*\{",
    re.M,
)


def _params(raw):
    """Split a parameter list at top-level commas; extract name (+ type)."""
    raw = raw.strip()
    if not raw:
        return []
    chunks, depth, cur = [], 0, ""
    for ch in raw:
        if ch in "<({[":
            depth += 1
            cur += ch
        elif ch in ">)}]":
            depth -= 1
            cur += ch
        elif ch == "," and depth == 0:
            chunks.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        chunks.append(cur)
    out = []
    for c in chunks:
        c = c.strip()
        m = re.match(
            r"^(\.\.\.)?([A-Za-z_$][\w$]*)\??\s*(?::\s*(.+?))?(?:\s*=\s*.+)?$", c
        )
        if m:
            entry = {"name": (m.group(1) or "") + m.group(2)}
            if m.group(3):
                entry["type"] = {"text": m.group(3).strip()}
            out.append(entry)
        else:
            out.append({"name": c})  # destructured/complex — keep raw
    return out


def parse_methods(s):
    """Public instance/static methods as CEM method members. Excludes
    private/protected members, lifecycle callbacks, and render* helpers."""
    out, seen = [], set()
    for m in _METHOD_RE.finditer(s):
        mods, name, raw_params, ret = m.groups()
        if "private" in mods or "protected" in mods:
            continue
        if name in _METHOD_LIFECYCLE or name in _METHOD_KEYWORDS:
            continue
        if name.startswith("render"):
            continue
        if name in seen:
            continue
        seen.add(name)

        # JSDoc immediately preceding the method (only whitespace between).
        before = s[: m.start()]
        docs = list(ANY_DOC.finditer(before))
        dm = docs[-1] if docs else None
        if dm and re.search(r"[;{}]", before[dm.end() :]):
            dm = None

        entry = {"kind": "method", "name": name}
        if "static " in mods:
            entry["static"] = True
        if dm:
            d = clean_jsdoc(dm.group(1))
            if d:
                entry["description"] = d
        params = _params(raw_params)
        if params:
            entry["parameters"] = params
        if ret and ret.strip() not in ("void",):
            entry["return"] = {"type": {"text": ret.strip()}}
        out.append(entry)
    return out


# ---------------------------------------------------------------------------
# Plugins  (data-grid-*/rich-text-* packages that build a grid/editor plugin,
# as opposed to a custom element). Consumed by gencatalog.py.
# ---------------------------------------------------------------------------

_PLUGIN_FACTORY_CALL = re.compile(r"(?:=\s*|return\s+)define(DataGrid|RichText)Plugin\(")
_PLUGIN_FACTORY_FN = re.compile(
    r"export function (\w+Plugin)\(([^)]*)\)\s*:\s*(?:DataGridPlugin|RichTextPlugin)\b"
)
_PLUGIN_READY_CONST = re.compile(r"export const (\w+Plugin)\s*=")


def plugin_host(pkg):
    """Which plugin family (if any) this package belongs to — decided by whether its source
    actually CALLS `defineDataGridPlugin`/`defineRichTextPlugin` to build a plugin object, not by
    a `data-grid-`/`rich-text-` name prefix. A package with an `export class Dj...` is a
    component, never a plugin, even if a define*Plugin call appears somewhere in it (the host
    packages themselves call it to build the plugin machinery). Returns "data-grid", "rich-text",
    or None — this is the detection rule locked in by plugin-catalog-spec.md."""
    found = None
    for f in sorted(glob.glob(f"{PKGS}/{pkg}/src/*.ts")):
        s = open(f).read()
        if re.search(r"export class Dj\w+", s):
            return None
        m = _PLUGIN_FACTORY_CALL.search(s)
        if m:
            found = "data-grid" if m.group(1) == "DataGrid" else "rich-text"
    return found


def plugin_api(pkg):
    """(factory_name, factory_params, ready_names) for a plugin package.
    factory_name/params: the exported function whose name ends in `Plugin` and returns a
    `DataGridPlugin`/`RichTextPlugin` (`None, None` when the package only exports ready-made
    instances with nothing left to configure — e.g. `rich-text-headings`). ready_names: exported
    `const xPlugin = ...` instances, in source order — 0, 1, or more (e.g. `rich-text-color`
    exports both `colorPlugin` and `backgroundColorPlugin` off one factory)."""
    factory_name, factory_params, ready = None, None, []
    for f in sorted(glob.glob(f"{PKGS}/{pkg}/src/*.ts")):
        s = open(f).read()
        if factory_name is None:
            fm = _PLUGIN_FACTORY_FN.search(s)
            if fm:
                factory_name, factory_params = fm.group(1), fm.group(2)
        for cm in _PLUGIN_READY_CONST.finditer(s):
            ready.append(cm.group(1))
    return factory_name, factory_params, ready


def options_type_of(params):
    """The exported options interface/type name annotating a factory's parameter list, or None
    (a bare `(): DataGridPlugin` factory has no params and so no type to find)."""
    matches = re.findall(r":\s*(\w+)", params or "")
    return matches[-1] if matches else None


def _top_level_split(body):
    """Split a TS interface/type body into member strings at top-level `;` only — depth-tracked
    over `{}`/`()`/`<>` so a member whose own type contains a nested object/generic (e.g.
    `source: (q: string) => Promise<Array<{ id: string }>>;`) isn't split at the inner `;`. Two
    traps handled explicitly: the `>` in an arrow `=>` is NOT a closing angle bracket (a lone `>`
    with no matching `<` would desync the depth count), and a `/** ... */` JSDoc comment is
    scanned as opaque text — its own prose very often contains a bare `;` (a sentence boundary)
    or unbalanced-looking punctuation that has nothing to do with the code around it."""
    members, depth, cur = [], 0, ""
    i, n = 0, len(body)
    in_comment = False
    while i < n:
        if not in_comment and body[i : i + 2] == "/*":
            in_comment = True
            cur += body[i : i + 2]
            i += 2
            continue
        if in_comment and body[i : i + 2] == "*/":
            in_comment = False
            cur += body[i : i + 2]
            i += 2
            continue
        ch = body[i]
        if in_comment:
            cur += ch
            i += 1
            continue
        if ch == ">" and i > 0 and body[i - 1] == "=":
            cur += ch
            i += 1
            continue
        if ch in "{(<[":
            depth += 1
        elif ch in "})>]":
            depth -= 1
        if ch == ";" and depth == 0:
            members.append(cur)
            cur = ""
        else:
            cur += ch
        i += 1
    if cur.strip():
        members.append(cur)
    return [m for m in members if m.strip()]


_MEMBER_RE = re.compile(
    r"^\s*(?:/\*\*(?P<doc>.*?)\*/\s*)?(?P<name>\w+)(?P<opt>\??)(?P<params>\([^)]*\))?\s*:\s*(?P<type>.*)$",
    re.S,
)


def interface_fields(pkg, name):
    """[{name, optional, type, description}] for an exported `interface <name> { ... }` found in
    any of a package's source files, in declaration order — or None if `name` is falsy or no such
    interface is found (a factory that takes no options has nothing to look up)."""
    if not name:
        return None
    for f in sorted(glob.glob(f"{PKGS}/{pkg}/src/*.ts")):
        s = open(f).read()
        m = re.search(rf"export\s+interface\s+{re.escape(name)}(?:\s+extends\s+[\w,\s]+)?\s*\{{", s)
        if not m:
            continue
        depth, i = 1, m.end()
        while depth > 0 and i < len(s):
            if s[i] == "{":
                depth += 1
            elif s[i] == "}":
                depth -= 1
            i += 1
        body = s[m.end() : i - 1]
        fields = []
        for member in _top_level_split(body):
            fm = _MEMBER_RE.match(member)
            if not fm:
                continue
            fields.append(
                dict(
                    name=fm.group("name"),
                    optional=bool(fm.group("opt")),
                    params=(" ".join(fm.group("params").split()) if fm.group("params") else ""),
                    type=" ".join(fm.group("type").split()),
                    description=clean_jsdoc(fm.group("doc")) if fm.group("doc") else "",
                )
            )
        return fields
    return None


# ---------------------------------------------------------------------------
# CSS custom properties  (@cssprop / @cssproperty JSDoc tags)
# ---------------------------------------------------------------------------

# Forms accepted (CEM-analyzer convention):
#   @cssprop --name - description
#   @cssprop [--name=default] - description     (default may itself contain "--",
#                                                e.g. var(--dj-x), so the bracketed
#                                                form is matched up to the closing ])
#   @cssproperty {<syntax>} --name - description
_SYNTAX = r"(?:\{[^}]*\}\s*)?"  # optional {<syntax>}
_CSSPROP_BRACKET = re.compile(
    r"@css(?:prop|property)\s+" + _SYNTAX
    + r"\[\s*(--[A-Za-z0-9-]+)\s*(?:=\s*([^\]]*?))?\s*\]"  # [--name=default]
    + r"\s*(?:[-–]\s*(.+))?$"                              # - description
)
_CSSPROP_BARE = re.compile(
    r"@css(?:prop|property)\s+" + _SYNTAX
    + r"(--[A-Za-z0-9-]+)"                                 # --name
    + r"(?:\s+[-–]\s*(.+))?$"                              # - description
)


def parse_cssprops(doc):
    """CSS custom properties declared with @cssprop/@cssproperty in the class
    JSDoc. Returns [{name, default?, description?}] in declaration order."""
    out, seen = [], set()
    for raw in doc.splitlines():
        line = raw.strip()
        m = _CSSPROP_BRACKET.search(line)
        if m:
            name, default, desc = m.group(1), m.group(2), m.group(3)
        else:
            m = _CSSPROP_BARE.search(line)
            if not m:
                continue
            name, default, desc = m.group(1), None, m.group(2)
        if name in seen:
            continue
        seen.add(name)
        entry = {"name": name}
        if default and default.strip():
            entry["default"] = default.strip()
        if desc and desc.strip():
            entry["description"] = desc.strip()
        out.append(entry)
    return out


# ---------------------------------------------------------------------------
# Markdown formatting (shared by the two doc generators)
# ---------------------------------------------------------------------------


def md_safe(text):
    """Escape angle brackets OUTSIDE backtick code spans so they don't render
    as HTML in Markdown."""
    parts = text.split("`")
    for i in range(0, len(parts), 2):
        parts[i] = parts[i].replace("<", "&lt;").replace(">", "&gt;")
    return "`".join(parts)


def cell(text):
    """Escape pipes for a Markdown table cell (breaks cells even in code spans)."""
    return text.replace("|", "\\|")


def fmt_named_md(items):
    """Render [{name, description}] inline: `name` (desc), default (desc)."""
    out = []
    for it in items:
        nm = "default" if it["name"] == "" else f"`{it['name']}`"
        out.append(f"{nm} ({it['description']})" if it.get("description") else nm)
    return ", ".join(out)


def fmt_methods_md(methods):
    """Render parse_methods() output inline: `name(p: type): ret` (desc), ..."""
    out = []
    for m in methods:
        params = ", ".join(
            p["name"] + (f": {p['type']['text']}" if p.get("type") else "")
            for p in m.get("parameters", [])
        )
        sig = f"{m['name']}({params})"
        if m.get("return"):
            sig += f": {m['return']['type']['text']}"
        s = f"`{sig}`"
        if m.get("description"):
            s += f" ({m['description']})"
        out.append(s)
    return ", ".join(out)


def fmt_cssprops_md(props):
    """Render parse_cssprops() output inline: `--name` (default `x`; desc), ..."""
    out = []
    for p in props:
        bits = []
        if p.get("default"):
            bits.append(f"default `{p['default']}`")
        if p.get("description"):
            bits.append(p["description"])
        s = f"`{p['name']}`"
        if bits:
            s += f" ({'; '.join(bits)})"
        out.append(s)
    return ", ".join(out)
