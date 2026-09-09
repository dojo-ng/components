#!/usr/bin/env python3
"""crap.py - score every function by the CRAP metric (Change Risk Anti-Patterns).

    CRAP(f) = complexity(f)^2 * (1 - coverage(f))^3 + complexity(f)

Complexity is cyclomatic complexity; coverage is the fraction of the function's
executable lines exercised by tests. Alberto Savoia and Bob Evans, 2007.

Stdlib only. Handles TypeScript, JavaScript, and Python.
"""

import argparse
import ast
import fnmatch
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

THRESHOLD = 30.0        # the classic "crappy" line
SIMPLIFY_CC = 10        # McCabe's "getting complex" line
COVERED = 0.80          # coverage fraction that counts as "has tests"

FILL = "~"              # stands in for masked string/comment/regex spans
JS_EXT = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts")
PY_EXT = (".py",)

SKIP_DIRS = {
    "node_modules", "dist", "build", "out", "coverage", ".git", ".hg", ".svn",
    "__pycache__", ".venv", "venv", ".tox", ".mypy_cache", ".pytest_cache",
    "vendor", "third_party", ".next", ".nuxt", ".cache", "site-packages",
}
SKIP_FILES = [
    "*.min.js", "*.d.ts", "*.test.*", "*.spec.*", "test_*.py", "*_test.py",
    "conftest.py", "*.stories.*", "*.config.js", "*.config.mjs", "*.config.ts",
]
SKIP_PATH_PARTS = ("__tests__", "__mocks__", "/test/", "/tests/", "/spec/", "/fixtures/")


# ---------------------------------------------------------------- JS/TS masking

def mask_js(src):
    """Blank out comments, string bodies, template text, and regex literals.

    Returns a string the same length as src, with those spans replaced by FILL
    (newlines preserved), so offsets and line numbers still line up and brace
    matching and keyword scanning cannot be fooled by their contents. Code
    inside template-literal ${...} substitutions is left intact.

    FILL is a non-space character on purpose: blanking a string to spaces would
    turn `n > 0 ? "a" : "b"` into `n > 0 ?     :    `, which then looks exactly
    like a TypeScript optional marker and loses the ternary.
    """
    out = list(src)
    n = len(src)
    i = 0
    stack = []      # ('tpl', 0) inside a template, ('sub', saved_depth) inside ${...}
    depth = 0       # brace depth within the current code region
    prev = ""       # last significant char, for the regex-vs-divide call

    def blank(a, b):
        for k in range(a, min(b, n)):
            if out[k] != "\n":
                out[k] = FILL

    while i < n:
        if stack and stack[-1][0] == "tpl":
            c = src[i]
            if c == "\\":
                blank(i, i + 2)
                i += 2
                continue
            if c == "`":
                stack.pop()
                i += 1
                prev = "x"
                continue
            if c == "$" and i + 1 < n and src[i + 1] == "{":
                stack.append(("sub", depth))
                depth = 0
                i += 2
                prev = ""
                continue
            blank(i, i + 1)
            i += 1
            continue

        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""

        if c == "/" and nxt == "/":
            j = src.find("\n", i)
            j = n if j < 0 else j
            blank(i, j)
            i = j
            continue
        if c == "/" and nxt == "*":
            j = src.find("*/", i + 2)
            j = n if j < 0 else j + 2
            blank(i, j)
            i = j
            continue
        if c in "\"'":
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == c:
                    j += 1
                    break
                if src[j] == "\n":
                    break
                j += 1
            blank(i, j)
            i = j
            prev = "x"
            continue
        if c == "`":
            stack.append(("tpl", 0))
            i += 1
            continue
        if c == "/" and prev not in ("x", ")", "]", "}"):
            # regex literal, not division
            j = i + 1
            cls = False
            ok = False
            while j < n:
                d = src[j]
                if d == "\\":
                    j += 2
                    continue
                if d == "\n":
                    break
                if d == "[":
                    cls = True
                elif d == "]":
                    cls = False
                elif d == "/" and not cls:
                    j += 1
                    ok = True
                    break
                j += 1
            if ok:
                while j < n and src[j].isalpha():
                    j += 1
                blank(i, j)
                i = j
                prev = "x"
                continue
        if c == "{":
            depth += 1
        elif c == "}":
            if depth == 0 and stack and stack[-1][0] == "sub":
                depth = stack.pop()[1]
                i += 1
                prev = "x"
                continue
            depth -= 1
        if not c.isspace():
            prev = "x" if (c.isalnum() or c in "_$)]}") else c
        i += 1

    return "".join(out)


# ------------------------------------------------------ JS/TS function finding

JS_KEYWORDS_BEFORE_PAREN = {
    "if", "for", "while", "switch", "catch", "return", "typeof", "instanceof",
    "in", "of", "new", "delete", "void", "await", "yield", "do", "else", "case",
    "throw", "with", "import", "export", "default", "extends", "super", "this",
}

RE_FUNC_KW = re.compile(r"\bfunction\b\s*\*?\s*([A-Za-z_$][\w$]*)?")
RE_ARROW = re.compile(r"=>")
RE_METHOD = re.compile(
    r"(?:^|[{;}\n])[ \t]*"
    r"(?:(?:public|private|protected|static|readonly|abstract|override|declare)\s+)*"
    r"(?:(?P<acc>get|set)\s+)?(?:async\s+)?\*?\s*"
    r"(?P<name>[A-Za-z_$#][\w$]*|\[[^\]\n]+\])\s*"
    r"(?:<[^<>(){};=]*>)?\s*\("
)


def match_brace(masked, open_idx):
    depth = 0
    for k in range(open_idx, len(masked)):
        c = masked[k]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return k
    return -1


def skip_params(masked, paren_idx):
    """Given index of '(', return index just past the matching ')'."""
    depth = 0
    for k in range(paren_idx, len(masked)):
        c = masked[k]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return k + 1
    return -1


def next_body_brace(masked, pos):
    """From just past a parameter list, find the '{' that opens the body.

    Skips a TypeScript return-type annotation. Returns -1 if what follows is
    not a block body.
    """
    k = pos
    n = len(masked)
    while k < n:
        c = masked[k]
        if c.isspace():
            k += 1
            continue
        if c == "{":
            return k
        if c == ":":
            # return type annotation - scan to '{' or a terminator
            k += 1
            ang = 0
            while k < n:
                d = masked[k]
                if d == "<":
                    ang += 1
                elif d == ">":
                    ang -= 1
                elif d == "{" and ang <= 0:
                    return k
                elif d in ";=)" and ang <= 0:
                    return -1
                k += 1
            return -1
        return -1
    return -1


def arrow_start(masked, arrow):
    """Index where an arrow function's parameter list begins.

    Walks left from `=>` past any TypeScript return-type annotation to the
    closing paren of the parameter list, or to the lone identifier of a
    paren-less single-parameter arrow.
    """
    j = arrow - 1
    while j >= 0 and masked[j].isspace():
        j -= 1
    if j < 0:
        return arrow
    ident_end = None
    if masked[j].isalnum() or masked[j] in "_$":
        k = j
        while k >= 0 and (masked[k].isalnum() or masked[k] in "_$"):
            k -= 1
        ident_end = k + 1
    # look left for the parameter list's ')', tolerating generics and tuples
    ang = 0
    k = j
    limit = max(0, arrow - 400)
    while k >= limit:
        c = masked[k]
        if c in "]>":
            ang += 1
        elif c in "[<":
            ang -= 1
        elif ang <= 0:
            if c == ")":
                d = 0
                while k >= 0:
                    if masked[k] == ")":
                        d += 1
                    elif masked[k] == "(":
                        d -= 1
                        if d == 0:
                            return k
                    k -= 1
                break
            if c in "=;,({":
                break
        k -= 1
    return ident_end if ident_end is not None else arrow


def backward_name(masked, idx):
    """Name for an arrow function, read from what precedes it."""
    head = masked[max(0, idx - 200):idx]
    for pat in (
        r"(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]{0,80})?=\s*(?:async\s*)?$",
        r"([A-Za-z_$][\w$]*)\s*(?::[^=]{0,80})?=\s*(?:async\s*)?$",
        r"([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?$",
    ):
        m = re.search(pat, head)
        if m:
            return m.group(1)
    m = re.search(r"([A-Za-z_$][\w$]*)\s*\(\s*(?:async\s*)?$", head)
    if m:
        return "%s(callback)" % m.group(1)
    if re.search(r"\breturn\s+(?:async\s*)?$", head):
        return "(returned)"
    if re.search(r"\bexport\s+default\s+(?:async\s*)?$", head):
        return "(default export)"
    return "(anonymous)"


def find_js_functions(masked):
    """Return [(name, start_idx, end_idx)] for block-bodied functions."""
    found = []

    for m in RE_FUNC_KW.finditer(masked):
        p = masked.find("(", m.end())
        if p < 0 or masked[m.end():p].strip(") \t\n"):
            continue
        after = skip_params(masked, p)
        if after < 0:
            continue
        b = next_body_brace(masked, after)
        if b < 0:
            continue
        e = match_brace(masked, b)
        if e < 0:
            continue
        found.append((m.group(1) or "(anonymous function)", m.start(), e + 1))

    for m in RE_ARROW.finditer(masked):
        k = m.end()
        while k < len(masked) and masked[k].isspace():
            k += 1
        if k >= len(masked) or masked[k] != "{":
            continue        # expression-bodied arrow: folded into its parent
        e = match_brace(masked, k)
        if e < 0:
            continue
        s = arrow_start(masked, m.start())
        found.append((backward_name(masked, s), s, e + 1))

    for m in RE_METHOD.finditer(masked):
        name = m.group("name")
        if name in JS_KEYWORDS_BEFORE_PAREN or name == "function":
            continue
        p = masked.rindex("(", m.start(), m.end())
        after = skip_params(masked, p)
        if after < 0:
            continue
        b = next_body_brace(masked, after)
        if b < 0:
            continue
        e = match_brace(masked, b)
        if e < 0:
            continue
        if m.group("acc"):
            name = "%s %s" % (m.group("acc"), name)
        found.append((name, m.start("name"), e + 1))

    # de-duplicate: the same body can be reached by more than one pattern
    by_end = {}
    for name, s, e in found:
        if e not in by_end or s < by_end[e][1]:
            by_end[e] = (name, s, e)
    return sorted(by_end.values(), key=lambda t: (t[1], -t[2]))


RE_JS_DECISION = re.compile(
    r"\b(if|for|while|case|catch)\b"
    r"|&&|\|\||\?\?"
)


def js_complexity(body):
    c = 1
    for m in RE_JS_DECISION.finditer(body):
        c += 1
    # ternaries: '?' that is not '?.', '??', or a TS optional marker '?:'
    for m in re.finditer(r"\?", body):
        i = m.start()
        if body[i - 1:i] == "?" or body[i + 1:i + 2] in ("?", "."):
            continue
        j = i + 1
        while j < len(body) and body[j].isspace():
            j += 1
        if j < len(body) and body[j] == ":":
            continue
        c += 1
    return c


PROMOTE_LINES = 8       # a nested function this long gets scored on its own
PROMOTE_CC = 5          # ... or this complex


def attribute_nesting(items):
    """Decide which nested functions get their own row, and split complexity.

    A short inline callback belongs to the function it sits in - counting it
    separately would report a pile of cc=1 rows and hide the branching its
    parent actually carries. A nested function that is long or complex in its
    own right is a unit, so it gets its own row and its decision points are
    taken back out of the parent's count.

    Each item needs: span (start, end), line, end_line, total (complexity of
    the whole span). Returns the promoted items with `complexity` set.
    """
    items = sorted(items, key=lambda f: (f["span"][0], -f["span"][1]))
    n = len(items)
    kids = [[] for _ in range(n)]
    parent = [None] * n
    stack = []
    for i, f in enumerate(items):
        while stack:
            ps, pe = items[stack[-1]]["span"]
            if ps <= f["span"][0] and f["span"][1] <= pe:
                break
            stack.pop()
        if stack:
            parent[i] = stack[-1]
            kids[stack[-1]].append(i)
        stack.append(i)

    cc = [1] * n
    promoted = [False] * n
    inner_first = sorted(range(n), key=lambda i: items[i]["span"][1] - items[i]["span"][0])
    for i in inner_first:
        removed = 0
        for c in kids[i]:
            child_decisions = items[c]["total"] - 1
            # a promoted child leaves entirely; an absorbed one leaves behind
            # only whatever its own promoted descendants took
            removed += child_decisions if promoted[c] else child_decisions - (cc[c] - 1)
        cc[i] = max(1, items[i]["total"] - removed)
        span_lines = items[i]["end_line"] - items[i]["line"] + 1
        promoted[i] = (parent[i] is None
                       or span_lines >= PROMOTE_LINES
                       or cc[i] >= PROMOTE_CC)

    # a promoted callback is far easier to find with its host's name on it
    def qualify(i):
        name = items[i]["name"]
        p = parent[i]
        if p is None or not (name.startswith("(") or name.endswith("(callback)")):
            return name
        return "%s > %s" % (qualify(p), name)

    out = []
    for i in range(n):
        if not promoted[i]:
            continue
        f = dict(items[i])
        f["name"] = qualify(i)
        f["complexity"] = cc[i]
        f.pop("span")
        f.pop("total")
        out.append(f)
    return out


def scan_js(path, src):
    masked = mask_js(src)
    starts = line_starts(src)
    items = []
    for name, s, e in find_js_functions(masked):
        items.append({
            "file": path,
            "name": name,
            "line": line_of(starts, s),
            "end_line": line_of(starts, e - 1),
            "span": (s, e),
            "total": js_complexity(masked[s:e]),
        })
    return attribute_nesting(items)


# --------------------------------------------------------------- Python

PY_SIMPLE = (ast.If, ast.While, ast.For, ast.AsyncFor, ast.ExceptHandler,
             ast.IfExp, ast.Assert)


def py_complexity(node):
    c = 1
    for sub in ast.walk(node):
        if isinstance(sub, PY_SIMPLE):
            c += 1
        elif isinstance(sub, ast.BoolOp):
            c += len(sub.values) - 1
        elif isinstance(sub, ast.comprehension):
            c += 1 + len(sub.ifs)
        elif hasattr(ast, "match_case") and isinstance(sub, ast.match_case):
            c += 1
    return c


def scan_py(path, src):
    try:
        tree = ast.parse(src)
    except SyntaxError as exc:
        print("  skipped (syntax): %s: %s" % (path, exc), file=sys.stderr)
        return []
    items = []

    def walk(node, prefix):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                end = getattr(child, "end_lineno", child.lineno)
                items.append({
                    "file": path,
                    "name": prefix + child.name,
                    "line": child.lineno,
                    "end_line": end,
                    "span": (child.lineno, end),
                    "total": py_complexity(child),
                })
                walk(child, prefix + child.name + ".")
            elif isinstance(child, ast.ClassDef):
                walk(child, prefix + child.name + ".")
            else:
                walk(child, prefix)

    walk(tree, "")
    return attribute_nesting(items)


# --------------------------------------------------------------- coverage

def load_lcov(path):
    """lcov.info -> {abs_file: {line: hits}}"""
    cov = defaultdict(dict)
    cur = None
    with open(path, errors="replace") as fh:
        for raw in fh:
            line = raw.strip()
            if line.startswith("SF:"):
                cur = os.path.realpath(line[3:])
            elif line.startswith("DA:") and cur:
                try:
                    ln, hits = line[3:].split(",")[:2]
                    n = int(ln)
                    cov[cur][n] = cov[cur].get(n, 0) + int(hits)
                except ValueError:
                    pass
            elif line == "end_of_record":
                cur = None
    return cov


def load_cobertura(path):
    """coverage.py `coverage xml` / Cobertura -> {abs_file: {line: hits}}"""
    root = ET.parse(path).getroot()
    bases = [s.text for s in root.findall(".//sources/source") if s.text] or [""]
    cov = defaultdict(dict)
    for cls in root.iter("class"):
        fn = cls.get("filename") or ""
        real = None
        for b in bases:
            cand = os.path.realpath(os.path.join(b, fn))
            if os.path.exists(cand):
                real = cand
                break
        real = real or os.path.realpath(fn)
        for ln in cls.iter("line"):
            try:
                cov[real][int(ln.get("number"))] = int(ln.get("hits"))
            except (TypeError, ValueError):
                pass
    return cov


def load_json_coverage(path):
    """istanbul coverage-final.json or coverage.py `coverage json`."""
    with open(path, errors="replace") as fh:
        data = json.load(fh)
    cov = defaultdict(dict)

    if isinstance(data.get("files"), dict) and "meta" in data:      # coverage.py
        for fn, info in data["files"].items():
            real = os.path.realpath(fn)
            for ln in info.get("executed_lines", []):
                cov[real][ln] = 1
            for ln in info.get("missing_lines", []):
                cov[real].setdefault(ln, 0)
        return cov

    for fn, info in data.items():                                   # istanbul
        if not isinstance(info, dict) or "statementMap" not in info:
            continue
        real = os.path.realpath(info.get("path", fn))
        counts = info.get("s", {})
        for sid, loc in info["statementMap"].items():
            hits = counts.get(sid, 0)
            ln = loc.get("start", {}).get("line")
            if ln:
                cov[real][ln] = max(cov[real].get(ln, 0), hits)
    return cov


def load_coverage(paths):
    merged = defaultdict(dict)
    for p in paths:
        low = p.lower()
        if low.endswith(".xml"):
            part = load_cobertura(p)
        elif low.endswith(".json"):
            part = load_json_coverage(p)
        else:
            part = load_lcov(p)
        for f, lines in part.items():
            for ln, hits in lines.items():
                merged[f][ln] = max(merged[f].get(ln, 0), hits)
    return merged


def coverage_index(cov):
    """Also key each file by progressively shorter path suffixes, so coverage
    written from a different working directory still matches."""
    idx = dict(cov)
    for f, lines in cov.items():
        parts = f.split(os.sep)
        for k in range(1, min(len(parts), 6)):
            idx.setdefault(os.sep.join(parts[-k:]), lines)
    return idx


def lookup(idx, path):
    real = os.path.realpath(path)
    if real in idx:
        return idx[real]
    parts = real.split(os.sep)
    for k in range(len(parts), 0, -1):
        key = os.sep.join(parts[-k:])
        if key in idx:
            return idx[key]
    return None


# --------------------------------------------------------------- scoring

def crap(cc, cov):
    return cc * cc * (1.0 - cov) ** 3 + cc


def required_coverage(cc, threshold=THRESHOLD):
    """Coverage needed to bring a function of this complexity under threshold.
    None when no amount of coverage can do it."""
    if cc <= 0 or cc >= threshold:
        return None
    return max(0.0, 1.0 - ((threshold - cc) / float(cc * cc)) ** (1.0 / 3.0))


def band(cc, cov, score, threshold, simplify_cc, covered):
    if cc > threshold:
        return "REFACTOR"
    if score >= threshold:
        return "TEST"
    if cc >= simplify_cc and cov >= covered:
        return "SIMPLIFY"
    return "HEALTHY"


BAND_ORDER = ["REFACTOR", "TEST", "SIMPLIFY", "HEALTHY"]
BAND_WHY = {
    "REFACTOR": "complexity alone exceeds the threshold - full coverage still leaves it crappy",
    "TEST": "over the threshold, but coverage can bring it under without touching the code",
    "SIMPLIFY": "under the threshold and tested, but complex enough to be worth splitting (guideline)",
    "HEALTHY": "under the threshold",
}


# --------------------------------------------------------------- driver

def line_starts(src):
    starts = [0]
    for i, ch in enumerate(src):
        if ch == "\n":
            starts.append(i + 1)
    return starts


def line_of(starts, idx):
    lo, hi = 0, len(starts) - 1
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if starts[mid] <= idx:
            lo = mid
        else:
            hi = mid - 1
    return lo + 1


def excluded(path, extra):
    base = os.path.basename(path)
    norm = "/" + path.replace(os.sep, "/").lstrip("./")
    for pat in SKIP_FILES + list(extra):
        if fnmatch.fnmatch(base, pat) or fnmatch.fnmatch(norm, pat):
            return True
    return any(part in norm for part in SKIP_PATH_PARTS)


def collect(roots, extra_exclude, include_tests):
    files = []
    for root in roots:
        if os.path.isfile(root):
            files.append(root)
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames
                           if d not in SKIP_DIRS and not d.startswith(".")]
            for fn in filenames:
                p = os.path.join(dirpath, fn)
                if not p.endswith(JS_EXT + PY_EXT):
                    continue
                if not include_tests and excluded(p, extra_exclude):
                    continue
                files.append(p)
    return sorted(set(files))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="*", default=["."],
                    help="files or directories to score (default: .)")
    ap.add_argument("--coverage", action="append", default=[], metavar="FILE",
                    help="lcov.info, coverage.xml, coverage.json, or "
                         "coverage-final.json. Repeatable.")
    ap.add_argument("--threshold", type=float, default=THRESHOLD)
    ap.add_argument("--simplify-complexity", type=int, default=SIMPLIFY_CC)
    ap.add_argument("--covered", type=float, default=COVERED,
                    help="coverage fraction that counts as tested (default 0.8)")
    ap.add_argument("--exclude", action="append", default=[], metavar="GLOB")
    ap.add_argument("--include-tests", action="store_true")
    ap.add_argument("--top", type=int, default=25,
                    help="rows to print per band (0 = all)")
    ap.add_argument("--json", metavar="FILE", help="write full results as JSON")
    ap.add_argument("--fail-over", type=float, default=None, metavar="N",
                    help="exit 1 if any function scores at or above N")
    args = ap.parse_args()

    paths = args.paths or ["."]
    files = collect(paths, args.exclude, args.include_tests)
    if not files:
        print("no source files found", file=sys.stderr)
        return 2

    cov_idx = coverage_index(load_coverage(args.coverage)) if args.coverage else {}

    funcs = []
    for path in files:
        try:
            with open(path, errors="replace") as fh:
                src = fh.read()
        except OSError as exc:
            print("  skipped: %s: %s" % (path, exc), file=sys.stderr)
            continue
        funcs.extend(scan_py(path, src) if path.endswith(PY_EXT)
                     else scan_js(path, src))

    matched_files = 0
    for path in files:
        if lookup(cov_idx, path) is not None:
            matched_files += 1

    for f in funcs:
        lines = lookup(cov_idx, f["file"]) if cov_idx else None
        if lines:
            span = [h for ln, h in lines.items()
                    if f["line"] <= ln <= f["end_line"]]
            f["cov"] = (sum(1 for h in span if h > 0) / len(span)) if span else 1.0
            f["measured"] = bool(span)
        else:
            f["cov"] = 0.0
            f["measured"] = False
        f["crap"] = crap(f["complexity"], f["cov"])
        f["band"] = band(f["complexity"], f["cov"], f["crap"],
                         args.threshold, args.simplify_complexity, args.covered)
        need = required_coverage(f["complexity"], args.threshold)
        f["required_coverage"] = need

    funcs.sort(key=lambda f: (-f["crap"], -f["complexity"], f["file"], f["line"]))

    if args.json:
        with open(args.json, "w") as fh:
            json.dump({"threshold": args.threshold, "functions": funcs}, fh, indent=1)

    report(funcs, files, args, bool(cov_idx), matched_files)

    if args.fail_over is not None:
        if any(f["crap"] >= args.fail_over for f in funcs):
            return 1
    return 0


def report(funcs, files, args, have_cov, matched_files):
    total = len(funcs)
    if not total:
        print("no functions found")
        return

    print("CRAP = complexity^2 * (1 - coverage)^3 + complexity   "
          "| threshold %g" % args.threshold)
    print("%d functions in %d files" % (total, len(files)))
    if not have_cov:
        print()
        print("!! No coverage data given, so every function is scored at 0% "
              "coverage.")
        print("!! Scores are an upper bound and the bands are provisional. "
              "Pass --coverage.")
    elif matched_files < len(files):
        print("   coverage matched %d of %d files; the rest score as 0%% "
              "covered" % (matched_files, len(files)))
    print()

    counts = {b: sum(1 for f in funcs if f["band"] == b) for b in BAND_ORDER}
    crappy = sum(1 for f in funcs if f["crap"] >= args.threshold)
    for b in BAND_ORDER:
        print("  %-9s %5d  (%4.1f%%)  %s"
              % (b, counts[b], 100.0 * counts[b] / total, BAND_WHY[b]))
    print()
    print("  crap load: %d of %d functions score at or above %g (%.1f%%)"
          % (crappy, total, args.threshold, 100.0 * crappy / total))

    for b in BAND_ORDER[:-1]:
        rows = [f for f in funcs if f["band"] == b]
        if not rows:
            continue
        shown = rows if args.top == 0 else rows[:args.top]
        print()
        print("== %s (%d)%s" % (b, len(rows),
                                "" if len(shown) == len(rows)
                                else "  - showing top %d" % len(shown)))
        print("   %7s %5s %6s  %s" % ("CRAP", "cc", "cov", "function"))
        for f in shown:
            note = ""
            if b == "TEST" and f["required_coverage"] is not None:
                note = "  needs %.0f%% coverage" % (100 * f["required_coverage"])
            print("   %7.1f %5d %5.0f%%  %s:%d %s%s"
                  % (f["crap"], f["complexity"], 100 * f["cov"],
                     f["file"], f["line"], f["name"], note))


if __name__ == "__main__":
    sys.exit(main())
