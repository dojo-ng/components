/**
 * Build a real-DOM nodeApi bound to `doc` (defaults to the global `document`).
 * Throws a clear error when called with no document available (e.g. in Node
 * with nothing passed) rather than a bare `ReferenceError`.
 */
export function createDomApi(doc) {
    const d = doc ?? (typeof document !== "undefined" ? document : undefined);
    if (!d) {
        throw new Error("createDomApi(): no document is available. Pass a Document explicitly when running outside a browser.");
    }
    // node -> (event type -> listener), so removeEvent can find the handler to
    // detach even though it's given only the event type.
    const listeners = new WeakMap();
    return {
        create: (tag) => d.createElement(tag),
        createText: (data) => d.createTextNode(data),
        setText: (node, data) => {
            node.data = data;
        },
        setAttribute: (node, name, value) => {
            node.setAttribute(name, value);
        },
        removeAttribute: (node, name) => {
            node.removeAttribute(name);
        },
        setProperty: (node, name, value) => {
            node[name] = value;
        },
        setStyle: (node, name, value) => {
            // Empty string clears the declaration, matching applyProp/removeProp.
            if (name.indexOf("-") !== -1) {
                node.style.setProperty(name, value);
            }
            else {
                node.style[name] = value ?? "";
            }
        },
        addEvent: (node, type, listener) => {
            let map = listeners.get(node);
            if (!map)
                listeners.set(node, (map = new Map()));
            // Detach any prior listener for this type first, so a re-register never
            // leaves two live listeners on the same node/type.
            const existing = map.get(type);
            if (existing)
                node.removeEventListener(type, existing);
            map.set(type, listener);
            node.addEventListener(type, listener);
        },
        removeEvent: (node, type) => {
            const map = listeners.get(node);
            const listener = map?.get(type);
            if (listener) {
                node.removeEventListener(type, listener);
                map.delete(type);
            }
        },
        insertBefore: (parent, node, ref) => {
            parent.insertBefore(node, ref ?? null);
        },
        removeChild: (parent, node) => {
            parent.removeChild(node);
        },
    };
}
