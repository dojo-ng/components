# Property-first patch for the Dojo NG framework fork

Apply to `core/vdom.ts` (source) / `core/vdom.js` (compiled), inside `setProperties`,
in the branch that currently sends every string property to `setAttribute`.

## Before

```js
if (type === 'string' && propName !== 'innerHTML' && includesEventsAndAttributes) {
    updateAttribute(domNode, propName, propValue, nextWrapper.namespace);
}
```

## After (property-first for custom elements only)

```js
if (type === 'string' && propName !== 'innerHTML' && includesEventsAndAttributes) {
    var _pfTag = _mountOptions.nodeApi.getTag(domNode) || '';
    if (_pfTag.indexOf('-') !== -1 && (propName in domNode)) {
        _mountOptions.nodeApi.setProperty(domNode, propName, propValue);
    } else {
        updateAttribute(domNode, propName, propValue, nextWrapper.namespace);
    }
}
```

## What it does

For a custom element (tag contains a hyphen) whose instance has a matching property,
a string value is now assigned as a DOM property instead of an attribute. Native
elements and non-property strings (data-*, aria-*, class) are unchanged, so the
renderer still sets attributes where attributes are correct.

## Why scoped to custom elements

Avoids the read-only reflected-property landmines on native elements (e.g. input.list,
input.form). Generic Element properties (id, slot, style, part) PutForward to their
attribute/value, so they remain correct.

## Companion change in the component library

Form-associated controls associate by the `name` ATTRIBUTE, not the property
(verified in-browser: a property-only name yields an empty FormData). With
property-first, `name` is set as a property, so the controls must reflect it:
`@property({ reflect: true }) name?: string;`. Applied to text-input, text-area,
checkbox, radio, switch, native-select, select, typeahead, chip-typeahead, slider,
range-slider (the input variants inherit text-input).
