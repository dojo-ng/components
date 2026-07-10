# Vendored @dojo-ng/framework

These three files (vdom.js, dom-api.js, has.js) are a verbatim copy of
`framework/dist/core` (@dojo-ng/framework 0.3.0). The demo server is rooted at
`components/`, so the sibling framework repo isn't reachable by URL; this copy
keeps the demo import-map-only with no build step.

To refresh after a framework change:

    cd framework && npm run build
    cp dist/core/{vdom,dom-api,has}.js ../components/demos/interop/vendor/framework/
