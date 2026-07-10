/**
 * @dojo-ng/framework — v()-only VDOM renderer (clean-room rewrite, #126).
 *
 * Written fresh from the Dojo 8 VDOM design for a v()-only world — no widgets,
 * no Registry, no middleware. Progress by chunk:
 *   A — types, factories (v / tsx / dom), guards, renderer() skeleton.
 *   B — mount: build the DOM + live RNode tree, property-first, events, virtual,
 *       dom() adoption, deferred props, onAttach.
 *   C — non-keyed update: invalidate() re-runs the render fn and position-diffs
 *       (patch in place, replace on tag change, append/remove trailing, patch
 *       text in place).
 *   D — keyed reconciliation: O(n) reuse-by-key with minimal (LIS) moves, so a
 *       pure reorder/reverse never creates or removes and moves only what must.
 *   E — lifecycle + edges: onUpdate on re-render, onDetach (parent→child) on
 *       removal, and unmount() that tears the tree down and fires onDetach.
 *   F — ESM cutover: this module is now THE renderer (core/vdom). The interim
 *       hand-written renderer + Registry/RegistryHandler/icache are retired; the
 *       package is ESM (browser-loadable via import maps, no bundler).
 * Still ahead: G measure (bundle + perf deltas).
 */
import has from "./has.js";
import { createDomApi } from "./dom-api.js";
// Re-exported so consumers can `import { createDomApi } from "@dojo-ng/framework"`
// alongside the renderer. Also reachable at the "./core/dom-api" subpath.
export { createDomApi } from "./dom-api.js";
const VNODE = Symbol("dj-vnode");
const DOMVNODE = Symbol("dj-domvnode");
// ---------------------------------------------------------------------------
// Node guards
// ---------------------------------------------------------------------------
export function isVNode(child) {
    return Boolean(child) && typeof child !== "string" && child.type === VNODE;
}
export function isDomVNode(child) {
    return Boolean(child) && typeof child !== "string" && child.type === DOMVNODE;
}
function isElementNode(value) {
    return Boolean(value && value.tagName);
}
export function v(tag, propertiesOrChildren = {}, children) {
    let properties = propertiesOrChildren;
    let deferredPropertiesCallback;
    if (Array.isArray(propertiesOrChildren)) {
        children = propertiesOrChildren;
        properties = {};
    }
    if (typeof properties === "function") {
        deferredPropertiesCallback = properties;
        properties = {};
    }
    if (isVNode(tag)) {
        // Merge form: v(existingVNode, props) — combine classes/styles, override the rest.
        const { classes = [], styles = {}, ...rest } = properties;
        const base = tag.properties;
        const baseClasses = Array.isArray(base.classes) ? base.classes : base.classes != null ? [base.classes] : [];
        const newClasses = Array.isArray(classes) ? classes : [classes];
        properties = {
            ...base,
            ...rest,
            classes: [...baseClasses, ...newClasses],
            styles: { ...base.styles, ...styles }
        };
        children = children || tag.children;
        tag = tag.tag;
    }
    // Dev-only: v() (unlike tsx()) does not flatten nested child arrays, so a stray
    // array child would otherwise crash deep in createRNode with a confusing error.
    // Zero cost in production (guarded by dojo-debug).
    if (has("dojo-debug") && children) {
        for (const c of children) {
            if (Array.isArray(c)) {
                throw new TypeError("dojo-ng v(): a child is an Array — v() does not flatten nested child arrays. " +
                    "Spread or flatten it (e.g. ...items.map(fn) or children.flat()).");
            }
        }
    }
    return {
        tag: tag,
        properties: properties,
        deferredPropertiesCallback,
        children,
        type: VNODE
    };
}
// ---------------------------------------------------------------------------
// tsx() — JSX factory (v()-only: string tags route to v())
// ---------------------------------------------------------------------------
export function tsx(tag, properties = {}, ...children) {
    const flat = children.flat(Infinity) || [];
    const props = properties == null ? {} : properties;
    // The JSX types only permit string tags; this is a dev-only guard for untyped
    // callers (zero production cost) so a widget/component gives a clear error.
    if (has("dojo-debug") && typeof tag !== "string") {
        throw new TypeError("dojo-ng tsx: expected a string tag (intrinsic or custom element), but received " +
            typeof tag +
            ". Widget elements are not supported in the v()-only renderer.");
    }
    return v(tag, props, flat);
}
export function dom({ node, attrs = {}, props = {}, on = {}, onAttach, onDetach, onUpdate }, children) {
    return {
        tag: isElementNode(node) ? node.tagName.toLowerCase() : "",
        properties: props,
        attributes: attrs,
        events: on,
        children,
        domNode: node,
        onAttach,
        onUpdate,
        onDetach,
        type: DOMVNODE
    };
}
/** Flatten a class value (string | array) into a class attribute string. */
function classString(classes) {
    const list = Array.isArray(classes) ? classes : [classes];
    return list.filter((c) => typeof c === "string" && c).join(" ");
}
/** Resolve a VNode's properties, applying its deferred-properties callback ONCE.
 *  Call exactly once per node per render and reuse the result (stored on the RNode);
 *  the callback may be non-idempotent, so re-resolving would corrupt the diff baseline. */
function resolveProperties(vnode) {
    if (vnode.deferredPropertiesCallback) {
        return { ...vnode.properties, ...vnode.deferredPropertiesCallback() };
    }
    return vnode.properties;
}
/** The DOM nodes an RNode contributes to its parent (virtual flattens to its children). */
function domNodesOf(r) {
    if (!r)
        return [];
    if (r.kind === "virtual")
        return r.children.flatMap(domNodesOf);
    return r.domNode != null ? [r.domNode] : [];
}
const eventRegistry = new WeakMap();
/** Register or update the handler for (domNode, type). Installs the stable
 *  dispatcher on first use; afterwards just swaps the current handler (no DOM op). */
function setEventHandler(domNode, type, handler, nodeApi) {
    let byType = eventRegistry.get(domNode);
    if (!byType)
        eventRegistry.set(domNode, (byType = new Map()));
    const existing = byType.get(type);
    if (existing) {
        existing.current = handler;
        return;
    }
    const entry = { current: handler, dispatcher: (event) => entry.current(event) };
    byType.set(type, entry);
    nodeApi.addEvent(domNode, type, entry.dispatcher);
}
/** Remove the dispatcher for (domNode, type), if one is installed. */
function removeEventHandler(domNode, type, nodeApi) {
    const byType = eventRegistry.get(domNode);
    const entry = byType?.get(type);
    if (!entry)
        return;
    nodeApi.removeEvent(domNode, type);
    byType.delete(type);
}
/**
 * Native form-control props whose ATTRIBUTE only seeds the default, so they must
 * be driven as DOM PROPERTIES to stay controlled once the user has edited the
 * element: `value` on input/textarea/select/option, `checked` on input,
 * `selected` on option.
 */
function isControlledDomProp(tag, name) {
    switch (name) {
        case "value":
            return tag === "input" || tag === "textarea" || tag === "select" || tag === "option";
        case "checked":
            return tag === "input";
        case "selected":
            return tag === "option";
        default:
            return false;
    }
}
function setProperties(props, tag, domNode, nodeApi) {
    const isCustomElement = tag.indexOf("-") !== -1;
    for (const name in props) {
        if (name === "key")
            continue;
        const value = props[name];
        if (name === "classes") {
            const cls = classString(value);
            if (cls)
                nodeApi.setAttribute(domNode, "class", cls);
            continue;
        }
        if (name === "styles") {
            if (value)
                for (const s in value)
                    nodeApi.setStyle(domNode, s, value[s]);
            continue;
        }
        if (name.length > 2 && name[0] === "o" && name[1] === "n" && typeof value === "function") {
            setEventHandler(domNode, name.slice(2), value, nodeApi);
            continue;
        }
        if (isControlledDomProp(tag, name)) {
            nodeApi.setProperty(domNode, name, value);
            continue;
        }
        if (typeof value === "string" && name !== "innerHTML") {
            if (isCustomElement && name in domNode) {
                nodeApi.setProperty(domNode, name, value);
            }
            else {
                nodeApi.setAttribute(domNode, name, value);
            }
        }
        else {
            nodeApi.setProperty(domNode, name, value);
        }
    }
}
/** Apply a dom()-wrapped node's attrs/props/events to its existing DOM node. */
function applyDomVNode(dvnode, domNode, nodeApi) {
    for (const k in dvnode.attributes) {
        const v = dvnode.attributes[k];
        if (v != null)
            nodeApi.setAttribute(domNode, k, v);
    }
    for (const k in dvnode.properties) {
        if (k === "key")
            continue;
        nodeApi.setProperty(domNode, k, dvnode.properties[k]);
    }
    for (const k in dvnode.events) {
        setEventHandler(domNode, k, dvnode.events[k], nodeApi);
    }
}
/** Diff a dom()-wrapped node on re-render: apply only the attrs/props/events that
 *  changed since the previous DomVNode, so an unchanged re-render is a no-op and a
 *  handler is only re-registered when its reference changed (no duplicate listeners). */
function diffDomVNode(oldD, newD, domNode, nodeApi) {
    for (const k in newD.attributes) {
        const nv = newD.attributes[k];
        if (nv !== oldD.attributes[k]) {
            if (nv != null)
                nodeApi.setAttribute(domNode, k, nv);
            else
                nodeApi.removeAttribute(domNode, k);
        }
    }
    for (const k in oldD.attributes) {
        if (!(k in newD.attributes))
            nodeApi.removeAttribute(domNode, k);
    }
    for (const k in newD.properties) {
        if (k === "key")
            continue;
        if (newD.properties[k] !== oldD.properties[k])
            nodeApi.setProperty(domNode, k, newD.properties[k]);
    }
    for (const k in oldD.properties) {
        if (k === "key" || k in newD.properties)
            continue;
        nodeApi.setProperty(domNode, k, undefined);
    }
    for (const k in newD.events) {
        if (newD.events[k] !== oldD.events[k])
            setEventHandler(domNode, k, newD.events[k], nodeApi);
    }
    for (const k in oldD.events) {
        if (!(k in newD.events))
            removeEventHandler(domNode, k, nodeApi);
    }
}
/** Create the DOM subtree for a DNode and return its live RNode (or null). */
function createRNode(dnode, ctx) {
    if (dnode == null || dnode === false)
        return null;
    const { nodeApi } = ctx;
    if (typeof dnode === "string") {
        return { dnode, domNode: nodeApi.createText(dnode), children: [], kind: "text" };
    }
    if (isDomVNode(dnode)) {
        const domNode = dnode.domNode;
        applyDomVNode(dnode, domNode, nodeApi);
        if (dnode.onAttach)
            ctx.attach.push(dnode.onAttach);
        const children = createChildren(dnode.children, domNode, ctx);
        return { dnode, domNode, children, kind: "dom" };
    }
    if (dnode.tag === "virtual") {
        // No DOM node of its own; children are inserted into the eventual parent.
        // Keep a null slot per source child so updates stay index-aligned.
        const children = (dnode.children || []).map((c) => createRNode(c, ctx));
        return { dnode, domNode: undefined, children, kind: "virtual" };
    }
    const domNode = nodeApi.create(dnode.tag);
    const resolvedProps = resolveProperties(dnode);
    setProperties(resolvedProps, dnode.tag, domNode, nodeApi);
    const children = createChildren(dnode.children, domNode, ctx);
    return { dnode, domNode, children, kind: "element", resolvedProps };
}
/** Create + insert a list of child DNodes under a parent DOM node. Keeps a null
 *  slot per source child so later positional diffing stays index-aligned. */
function createChildren(children, parentDom, ctx) {
    const out = [];
    for (const c of children || []) {
        const r = createRNode(c, ctx);
        if (r)
            for (const dn of domNodesOf(r))
                ctx.nodeApi.insertBefore(parentDom, dn, null);
        out.push(r);
    }
    return out;
}
// ---------------------------------------------------------------------------
// Update / diff (chunk C — non-keyed, position-based)
// ---------------------------------------------------------------------------
//
// The v()-only update model: invalidate() re-runs the render function and diffs
// the new DNode tree against the live RNode tree. This chunk handles non-keyed
// reconciliation — patch in place when the tag matches, replace on a tag/kind
// change, append/remove trailing children, and patch text in place. Keyed
// reordering is chunk D.
/** Apply one property during an update, emitting a DOM op only when it changed. */
function applyProp(name, value, prev, tag, domNode, isCustomElement, nodeApi) {
    if (name === "classes") {
        const next = classString(value);
        const old = classString(prev);
        if (next !== old) {
            if (next)
                nodeApi.setAttribute(domNode, "class", next);
            else
                nodeApi.removeAttribute(domNode, "class");
        }
        return;
    }
    if (name === "styles") {
        const nv = value || {};
        const ov = prev || {};
        for (const s in nv)
            if (nv[s] !== ov[s])
                nodeApi.setStyle(domNode, s, nv[s]);
        for (const s in ov)
            if (!(s in nv))
                nodeApi.setStyle(domNode, s, "");
        return;
    }
    if (name.length > 2 && name[0] === "o" && name[1] === "n") {
        const isFn = typeof value === "function";
        const wasFn = typeof prev === "function";
        if (isFn) {
            // Swap the current handler behind the stable dispatcher — zero DOM ops.
            setEventHandler(domNode, name.slice(2), value, nodeApi);
            return;
        }
        if (wasFn) {
            // function → non-function: tear the listener down, then fall through so a
            // non-event value (e.g. a string) is still applied as attr/property.
            removeEventHandler(domNode, name.slice(2), nodeApi);
        }
        // else: neither is a function — not an event binding; fall through.
    }
    if (isControlledDomProp(tag, name)) {
        // Compare against the element's LIVE property, not the previous vnode value,
        // so a user edit (dirty value/checked) is overwritten to what the render intends.
        if (domNode[name] !== value)
            nodeApi.setProperty(domNode, name, value);
        return;
    }
    if (typeof value === "string" && name !== "innerHTML") {
        if (isCustomElement && name in domNode) {
            if (value !== prev)
                nodeApi.setProperty(domNode, name, value);
        }
        else if (value !== prev) {
            nodeApi.setAttribute(domNode, name, value);
        }
        return;
    }
    if (value !== prev)
        nodeApi.setProperty(domNode, name, value);
}
/** Undo a property present in the old VNode but absent from the new one. */
function removeProp(name, prev, domNode, isCustomElement, nodeApi) {
    if (name === "classes") {
        nodeApi.removeAttribute(domNode, "class");
        return;
    }
    if (name === "styles") {
        if (prev)
            for (const s in prev)
                nodeApi.setStyle(domNode, s, "");
        return;
    }
    if (name.length > 2 && name[0] === "o" && name[1] === "n" && typeof prev === "function") {
        removeEventHandler(domNode, name.slice(2), nodeApi);
        return;
    }
    if (typeof prev === "string" && name !== "innerHTML" && !(isCustomElement && name in domNode)) {
        nodeApi.removeAttribute(domNode, name);
        return;
    }
    nodeApi.setProperty(domNode, name, undefined);
}
/** Diff an element's already-resolved properties against the previous render's
 *  stored resolution (never re-invokes the old deferred callback). */
function diffProperties(oldProps, newProps, tag, domNode, nodeApi) {
    const isCustomElement = tag.indexOf("-") !== -1;
    for (const name in oldProps) {
        if (name === "key" || name in newProps)
            continue;
        removeProp(name, oldProps[name], domNode, isCustomElement, nodeApi);
    }
    for (const name in newProps) {
        if (name === "key")
            continue;
        applyProp(name, newProps[name], oldProps[name], tag, domNode, isCustomElement, nodeApi);
    }
}
/** The first DOM node an RNode contributes (for use as an insertBefore anchor). */
function firstDomNode(r) {
    const ds = domNodesOf(r);
    return ds.length ? ds[0] : null;
}
/** The first DOM node among slots `from..end` (anchor for inserting a new slot). */
function nextDomNode(children, from) {
    for (let i = from; i < children.length; i++) {
        const ds = domNodesOf(children[i]);
        if (ds.length)
            return ds[0];
    }
    return null;
}
/** Fire onDetach for every dom() node in a subtree, parent→child order. */
function fireDetach(r) {
    if (!r)
        return;
    if (r.kind === "dom" && r.dnode.onDetach)
        r.dnode.onDetach();
    for (const c of r.children)
        fireDetach(c);
}
/** Remove an RNode's DOM from its parent (virtual removes each child's DOM). */
function removeDom(r, parentDom, ctx) {
    if (r.kind === "virtual") {
        for (const c of r.children)
            if (c)
                removeDom(c, parentDom, ctx);
        return;
    }
    if (r.domNode != null)
        ctx.nodeApi.removeChild(parentDom, r.domNode);
}
/** Remove an RNode: fire its subtree's onDetach hooks, then detach its DOM. */
function removeRNode(r, parentDom, ctx) {
    if (!r)
        return;
    fireDetach(r);
    removeDom(r, parentDom, ctx);
}
/** Replace an old RNode with a freshly built one at the same position. */
function replaceRNode(oldR, dnode, parentDom, ctx) {
    const ref = firstDomNode(oldR);
    const r = createRNode(dnode, ctx);
    if (r)
        for (const dn of domNodesOf(r))
            ctx.nodeApi.insertBefore(parentDom, dn, ref);
    removeRNode(oldR, parentDom, ctx);
    return r;
}
/** Patch an existing RNode against a new DNode at the same position (both present). */
function patchRNode(oldR, dnode, parentDom, ctx) {
    const { nodeApi } = ctx;
    if (typeof dnode === "string") {
        if (oldR.kind === "text") {
            if (oldR.dnode !== dnode)
                nodeApi.setText(oldR.domNode, dnode);
            return { dnode, domNode: oldR.domNode, children: [], kind: "text" };
        }
        return replaceRNode(oldR, dnode, parentDom, ctx);
    }
    if (isDomVNode(dnode)) {
        if (oldR.kind === "dom" && oldR.domNode === dnode.domNode) {
            diffDomVNode(oldR.dnode, dnode, dnode.domNode, nodeApi);
            const children = updateChildren(dnode.domNode, oldR.children, dnode.children || [], ctx);
            if (dnode.onUpdate)
                dnode.onUpdate();
            return { dnode, domNode: dnode.domNode, children, kind: "dom" };
        }
        return replaceRNode(oldR, dnode, parentDom, ctx);
    }
    // VNode (element or virtual). Callers only pass a present node; the guard
    // narrows the type (away from string/dom/null/false) for the rest.
    if (!isVNode(dnode))
        return replaceRNode(oldR, dnode, parentDom, ctx);
    if (dnode.tag === "virtual") {
        if (oldR.kind === "virtual") {
            const children = updateChildren(parentDom, oldR.children, dnode.children || [], ctx);
            return { dnode, domNode: undefined, children, kind: "virtual" };
        }
        return replaceRNode(oldR, dnode, parentDom, ctx);
    }
    if (oldR.kind === "element" && oldR.dnode.tag === dnode.tag) {
        const resolvedProps = resolveProperties(dnode);
        diffProperties(oldR.resolvedProps ?? {}, resolvedProps, dnode.tag, oldR.domNode, nodeApi);
        const children = updateChildren(oldR.domNode, oldR.children, dnode.children || [], ctx);
        return { dnode, domNode: oldR.domNode, children, kind: "element", resolvedProps };
    }
    return replaceRNode(oldR, dnode, parentDom, ctx);
}
/** The key of a DNode (VNode with a `key` property), else undefined. */
function keyOf(dnode) {
    return isVNode(dnode) && dnode.properties.key != null ? dnode.properties.key : undefined;
}
/** Whether a live RNode can be reused (patched in place) for a new DNode. */
function compatible(r, dnode) {
    if (typeof dnode === "string")
        return r.kind === "text";
    if (isDomVNode(dnode))
        return r.kind === "dom" && r.domNode === dnode.domNode;
    if (!isVNode(dnode))
        return false;
    if (dnode.tag === "virtual")
        return r.kind === "virtual";
    return r.kind === "element" && r.dnode.tag === dnode.tag;
}
/** Indices forming a longest strictly-increasing subsequence of `arr`; entries
 *  equal to 0 are sentinels (newly created nodes) and never join the sequence. */
function lisIndices(arr) {
    const n = arr.length;
    const pred = new Array(n).fill(-1);
    const tails = []; // indices into arr; arr[tails[k]] increasing
    for (let i = 0; i < n; i++) {
        if (arr[i] === 0)
            continue;
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[tails[mid]] < arr[i])
                lo = mid + 1;
            else
                hi = mid;
        }
        if (lo > 0)
            pred[i] = tails[lo - 1];
        if (lo === tails.length)
            tails.push(i);
        else
            tails[lo] = i;
    }
    const set = new Set();
    let k = tails.length ? tails[tails.length - 1] : -1;
    while (k !== -1) {
        set.add(k);
        k = pred[k];
    }
    return set;
}
/** Reconcile children when keys are present: O(n) reuse-by-key with a minimal set
 *  of moves (longest-increasing-subsequence) so a pure reorder/reverse never
 *  creates, removes, or moves more nodes than necessary. */
function updateChildrenKeyed(parentDom, oldChildren, newDNodes, ctx) {
    const { nodeApi } = ctx;
    // Dev-only: warn once per render if a key repeats (later duplicates silently
    // overwrite earlier ones in the by-key map). Zero cost when dojo-debug is off.
    if (has("dojo-debug")) {
        const seen = new Set();
        for (const d of newDNodes) {
            const k = keyOf(d);
            if (k == null)
                continue;
            if (seen.has(k)) {
                console.warn(`dojo-ng: duplicate key ${JSON.stringify(k)} in a keyed list — keys must be unique; ` +
                    "later duplicates overwrite earlier ones.");
                break;
            }
            seen.add(k);
        }
    }
    // Index old children: keyed ones by key, unkeyed ones in order (positional
    // fallback for mixed lists). Remember each old node's original position.
    const oldByKey = new Map();
    const oldIndex = new Map();
    const unkeyedOld = [];
    for (let i = 0; i < oldChildren.length; i++) {
        const oldR = oldChildren[i];
        if (!oldR)
            continue;
        oldIndex.set(oldR, i);
        const k = keyOf(oldR.dnode);
        if (k != null)
            oldByKey.set(k, oldR);
        else
            unkeyedOld.push(oldR);
    }
    const reused = new Set();
    let uPtr = 0;
    const newR = new Array(newDNodes.length).fill(null);
    // source[i] = (old position + 1) for a reused slot, 0 for a freshly created one.
    const source = new Array(newDNodes.length).fill(0);
    // Pass 1: reuse+patch (in place, no moves yet) or create.
    for (let i = 0; i < newDNodes.length; i++) {
        const d = newDNodes[i];
        if (d == null || d === false)
            continue;
        const k = keyOf(d);
        let match = null;
        if (k != null) {
            const cand = oldByKey.get(k);
            if (cand && !reused.has(cand) && compatible(cand, d))
                match = cand;
        }
        else {
            while (uPtr < unkeyedOld.length) {
                const cand = unkeyedOld[uPtr++];
                if (!reused.has(cand) && compatible(cand, d)) {
                    match = cand;
                    break;
                }
            }
        }
        if (match) {
            reused.add(match);
            source[i] = oldIndex.get(match) + 1;
            newR[i] = patchRNode(match, d, parentDom, ctx);
        }
        else {
            newR[i] = createRNode(d, ctx);
        }
    }
    // Pass 2: remove old children that were not reused.
    for (const oldR of oldChildren) {
        if (oldR && !reused.has(oldR))
            removeRNode(oldR, parentDom, ctx);
    }
    // Pass 3: place nodes in order. Reused nodes whose relative order is unchanged
    // (the LIS) stay put; everything else is inserted before a right-to-left anchor.
    const stay = lisIndices(source);
    let anchor = null;
    for (let i = newR.length - 1; i >= 0; i--) {
        const r = newR[i];
        if (!r)
            continue;
        const doms = domNodesOf(r);
        if (source[i] !== 0 && stay.has(i)) {
            // already in the correct relative position — no DOM op
        }
        else {
            for (const dn of doms)
                nodeApi.insertBefore(parentDom, dn, anchor);
        }
        if (doms.length)
            anchor = doms[0];
    }
    return newR;
}
/** Dispatch children reconciliation: keyed when any child carries a key,
 *  otherwise the cheaper non-keyed positional diff (chunk C). */
function updateChildren(parentDom, oldChildren, newDNodes, ctx) {
    let keyed = false;
    for (const d of newDNodes) {
        if (keyOf(d) != null) {
            keyed = true;
            break;
        }
    }
    if (!keyed) {
        for (const oldR of oldChildren) {
            if (oldR && keyOf(oldR.dnode) != null) {
                keyed = true;
                break;
            }
        }
    }
    return keyed
        ? updateChildrenKeyed(parentDom, oldChildren, newDNodes, ctx)
        : updateChildrenNonKeyed(parentDom, oldChildren, newDNodes, ctx);
}
/**
 * Reconcile a parent's children non-keyed (by position): patch matching slots in
 * place, append trailing new children, remove trailing old ones. Returns the new
 * slot array (a null per falsy/absent child keeps positions aligned).
 */
function updateChildrenNonKeyed(parentDom, oldChildren, newDNodes, ctx) {
    const out = [];
    const oldLen = oldChildren.length;
    const newLen = newDNodes.length;
    const common = Math.min(oldLen, newLen);
    for (let i = 0; i < common; i++) {
        const oldR = oldChildren[i];
        const newD = newDNodes[i];
        if (newD == null || newD === false) {
            if (oldR)
                removeRNode(oldR, parentDom, ctx);
            out.push(null);
        }
        else if (oldR == null) {
            const r = createRNode(newD, ctx);
            if (r) {
                const ref = nextDomNode(oldChildren, i + 1);
                for (const dn of domNodesOf(r))
                    ctx.nodeApi.insertBefore(parentDom, dn, ref);
            }
            out.push(r);
        }
        else {
            out.push(patchRNode(oldR, newD, parentDom, ctx));
        }
    }
    // Trailing appends (new tree is longer).
    for (let i = common; i < newLen; i++) {
        const r = createRNode(newDNodes[i], ctx);
        if (r)
            for (const dn of domNodesOf(r))
                ctx.nodeApi.insertBefore(parentDom, dn, null);
        out.push(r);
    }
    // Trailing removals (old tree was longer).
    for (let i = common; i < oldLen; i++) {
        removeRNode(oldChildren[i], parentDom, ctx);
    }
    return out;
}
/**
 * Create a renderer over a v()-only render function. The v()-only update model:
 * `invalidate()` re-runs `renderFn` and diffs the result against the live tree
 * (v1 = whole-tree re-render + O(n) diff; sub-tree invalidation is a later
 * optimization). `invalidate()` batches: many calls in one tick collapse into a
 * single re-render on the next microtask (unless mounted with `sync: true`).
 */
export function renderer(renderFn) {
    let _options = { sync: false };
    let _nodeApi;
    let _root;
    let _rendered = [];
    let _pending = false;
    function mount(mountOptions = {}) {
        _options = { ..._options, ...mountOptions };
        if (_options.nodeApi) {
            _nodeApi = _options.nodeApi;
        }
        else if (typeof document !== "undefined") {
            _nodeApi = createDomApi(document);
        }
        else {
            throw new Error("renderer.mount(): no nodeApi was provided and no global document is available. " +
                "Pass { nodeApi } (e.g. from createDomApi(doc)) when running outside a browser.");
        }
        _root = _options.domNode;
        const ctx = { nodeApi: _nodeApi, attach: [] };
        const result = renderFn();
        const tree = Array.isArray(result) ? result : [result];
        _rendered = tree.map((dnode) => {
            const r = createRNode(dnode, ctx);
            if (r)
                for (const dn of domNodesOf(r))
                    _nodeApi.insertBefore(_root, dn, null);
            return r;
        });
        for (const fn of ctx.attach)
            fn();
    }
    function renderOnce() {
        const ctx = { nodeApi: _nodeApi, attach: [] };
        const result = renderFn();
        const tree = Array.isArray(result) ? result : [result];
        _rendered = updateChildren(_root, _rendered, tree, ctx);
        for (const fn of ctx.attach)
            fn();
    }
    function invalidate() {
        if (!_nodeApi)
            return; // not mounted yet
        if (_options.sync) {
            renderOnce();
            return;
        }
        if (_pending)
            return; // already scheduled; coalesce
        _pending = true;
        queueMicrotask(() => {
            if (_pending)
                flush();
        });
    }
    /** Run a pending batched render immediately. No-op if nothing is pending
     *  (so it's safe to call after invalidate() in sync mode). */
    function flush() {
        if (!_nodeApi || !_pending)
            return;
        _pending = false;
        renderOnce();
    }
    function unmount() {
        if (!_nodeApi)
            return; // not mounted
        _pending = false; // cancel any scheduled render
        const ctx = { nodeApi: _nodeApi, attach: [] };
        for (const r of _rendered)
            removeRNode(r, _root, ctx);
        _rendered = [];
    }
    return { mount, invalidate, flush, unmount };
}
export default renderer;
