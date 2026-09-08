# @dojo-ng/data-grid

## 0.1.1

### Patch Changes

- Fix the sticky header's `z-index` leaking onto the page. `:host` now sets `isolation: isolate`, so `.head`'s internal `z-index: 1` is contained within the component's own stacking context instead of competing with the consumer's page-level stacking order.
