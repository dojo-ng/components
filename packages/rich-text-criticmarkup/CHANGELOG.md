# @dojo-ng/rich-text-criticmarkup

## 0.1.1

### Patch Changes

- Fix whitespace handling at a paragraph-break seam (decision 18). Accepting a split break now
  absorbs the surrounding horizontal whitespace into the break instead of stranding a space at each
  new block's edge; accepting a merge break now inserts a single space where the break used to be
  instead of jamming the two sides together with nothing between them. Declining either restores the
  source exactly, with no whitespace gained or lost. Fixed at both the string-grammar level and the
  live Lexical-tree level, which this package always keeps in agreement.
