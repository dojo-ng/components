# @dojo-ng/calendar

## 0.1.1

### Patch Changes

- `dj-calendar`'s day-grid buttons now carry `part="day"`. The README documented `::part(day)` as a styling hook, but the buttons never had the attribute, so the hook did nothing. This shipped in source on 2026-09-03 and missed the 0.1.0 release.
