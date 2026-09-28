---
"@dojo-ng/rich-text-criticmarkup": patch
---

Fix three real-browser findings from NovelMaker's Q1.7 adoption pass (2026-09-27):

- Insertion, deletion, and highlight marks were unreadable in dark mode. Their content CSS used
  `success-100`/`danger-100`/`warning-100` backgrounds, which `theme.css` never redefines for dark
  mode, plus four bare `--dj-color-<hue>` tokens (`success`, `danger`, `primary`, `on-primary`) that
  `theme.css` never defines at all. Backgrounds now use `neutral-100`/`-200` (confirmed to invert);
  decorative accents use the numbered `-600`/`-700` shades that do exist and are redefined for dark.
- The suggest-edits toolbar toggle had no visible pressed state — `aria-pressed` alone has no
  reactive CSS on `dj-button`. It now switches to `kind="outlined"` while active, reusing
  `dj-button`'s own existing, already-themed style.
- The toolbar's six items, rendered as full visible text since Track T (to satisfy axe, which
  flagged icon+`aria-label`), overflowed a normal-width toolbar. They're icons again, each paired
  with a visually-hidden text label in the default slot (not a host-level `aria-label`), which
  gives the shadow `<button>` a real accessible name from its own content. A new browser test
  confirms this is axe-clean, not just visually smaller.
