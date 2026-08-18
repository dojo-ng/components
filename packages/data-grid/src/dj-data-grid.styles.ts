import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.wrap { display: flex; flex-direction: column; }
	.chrome { display: flex; align-items: center; gap: var(--dj-spacing-small, .75rem); padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem); }
	.grid { border: 1px solid var(--dj-color-border, #d1d5db); border-radius: var(--dj-input-border-radius-medium, .25rem); overflow: hidden; font-size: var(--dj-font-size-medium, 1rem); background: var(--dj-color-background, #fff); color: var(--dj-color-text, #1f2937); }
	.row { display: grid; align-items: center; }
	.head { position: sticky; top: 0; z-index: 1; background: var(--dj-color-neutral-50, #f9fafb); border-bottom: 1px solid var(--dj-color-border, #d1d5db); }
	.subhead { background: var(--dj-color-neutral-50, #f9fafb); border-bottom: 1px solid var(--dj-color-border, #d1d5db); }
	/* min-width:0 on grid-item cells so they shrink to their track (paired with the
	   minmax(0,1fr) template) instead of forcing the track wider and breaking alignment. */
	.subcell { min-width: 0; padding: var(--dj-spacing-3x-small, .25rem) var(--dj-spacing-small, .75rem); }
	.hcell { min-width: 0; overflow: hidden; display: flex; align-items: center; gap: .25rem; padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem); font-weight: var(--dj-font-weight-semibold, 600); color: var(--dj-color-text-muted, #6b7280); user-select: none; }
	.hcell.sortable { cursor: pointer; } .hcell.sortable:hover { color: var(--dj-color-text, #1f2937); }
	.sortind { display: inline-flex; opacity: .7; width: 1em; }
	.scroll { overflow: auto; outline: none; }
	.scroll:focus-visible { outline: var(--dj-focus-ring, 2px solid currentColor); outline-offset: -2px; }
	.vrow { position: absolute; left: 0; right: 0; display: grid; align-items: center; border-bottom: 1px solid var(--dj-color-neutral-100, #f3f4f6); }
	/* Measured wrapper for master-detail: carries the absolute positioning; the row inside is static. */
	.vwrap { position: absolute; left: 0; right: 0; }
	.vdetail { border-bottom: 1px solid var(--dj-color-neutral-100, #f3f4f6); background: var(--dj-color-neutral-50, #f9fafb); }
	.detail { padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem); }
	.vrow:hover { background: var(--dj-color-neutral-50, #f9fafb); }
	.vrow--active { background: var(--dj-color-neutral-100, #f3f4f6); }
	.vrow--selected { background: var(--dj-color-primary-100, #dbeafe); }
	.cell { padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	/* Forced colors: row tints collapse; use the system selected pair for selected rows and
	   an outline for the active (keyboard) row so both remain visible. */
	@media (forced-colors: active) {
		.vrow--active { background: Canvas; outline: 2px solid Highlight; outline-offset: -2px; }
		.vrow--selected { background: Highlight; color: HighlightText; }
	}
	/* Printing (dj-data-grid.ts's #renderPrintTable, plain row path only): a genuine <table>/<thead>,
	   not the screen template's div grid. An earlier version tried to make the SCREEN markup repeat
	   its header via CSS alone (display:table-header-group on a div, relying on the "anonymous table"
	   fix-up rules) — that did not reliably repeat across pages in a real print preview (confirmed
	   2026-08-18), where a genuine HTML <thead> just does, in every major engine, unprompted. These
	   rules are not gated behind @media print because .print-table only ever exists in the DOM while
	   the printing state is true, which itself only happens between beforeprint/afterprint. render()
	   places the table as a SIBLING of .wrap, not nested inside it — .wrap is display:flex, and a
	   table that is a flex item does not get a browser's native repeating-thead behavior either
	   (the second bug this shipped with, alongside .wrap staying mounted-but-hidden rather than
	   unmounted while printing so the virtualizer's observers on .scroll survive the round trip). */
	.print-table { width: 100%; border-collapse: collapse; font-size: var(--dj-font-size-medium, 1rem); color: var(--dj-color-text, #1f2937); }
	.print-table th, .print-table td { text-align: left; padding: var(--dj-spacing-x-small, .5rem) var(--dj-spacing-small, .75rem); border-bottom: 1px solid var(--dj-color-neutral-100, #f3f4f6); }
	.print-table thead th { background: var(--dj-color-neutral-50, #f9fafb); font-weight: var(--dj-font-weight-semibold, 600); color: var(--dj-color-text-muted, #6b7280); }
	.print-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
`;
