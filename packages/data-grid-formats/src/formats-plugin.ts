import { LocaleController, getLocale, formatNumber, formatDate } from "@dojo-ng/i18n";
import { defineDataGridPlugin, type DataGridContext, type DataGridPlugin, type Row } from "@dojo-ng/data-grid";

/**
 * How a column's value is rendered. Either a custom function, or a declarative Intl kind whose
 * formatting is delegated to `@dojo-ng/i18n` (memoized `Intl` instances — no hand-rolled output).
 */
export type CellFormat =
	| ((value: unknown, row: Row) => string)
	| {
			kind: "number" | "currency" | "percent" | "date" | "time" | "datetime";
			/** Passed straight to the underlying `Intl` constructor for `kind`. */
			options?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions;
			/** ISO currency code for `kind: "currency"` (default `"USD"`). */
			currency?: string;
	  };

// Per-column config rides on GridColumn (plain objects, Bill's philosophy). Core never reads it.
declare module "@dojo-ng/data-grid" {
	interface GridColumn {
		/** How this column's value is displayed. Read by `formatsPlugin`. */
		format?: CellFormat;
	}
}

function applyFormat(fmt: CellFormat, value: unknown, row: Row, locale: string): string {
	if (typeof fmt === "function") return fmt(value, row);
	const num = () => Number(value);
	const date = () => value as Date | number | string;
	switch (fmt.kind) {
		case "number":
			return formatNumber(num(), locale, fmt.options as Intl.NumberFormatOptions);
		case "currency":
			return formatNumber(num(), locale, { style: "currency", currency: fmt.currency ?? "USD", ...(fmt.options as Intl.NumberFormatOptions) });
		case "percent":
			return formatNumber(num(), locale, { style: "percent", ...(fmt.options as Intl.NumberFormatOptions) });
		case "date":
			return formatDate(date(), locale, (fmt.options as Intl.DateTimeFormatOptions) ?? { dateStyle: "medium" });
		case "time":
			return formatDate(date(), locale, (fmt.options as Intl.DateTimeFormatOptions) ?? { timeStyle: "medium" });
		case "datetime":
			return formatDate(date(), locale, (fmt.options as Intl.DateTimeFormatOptions) ?? { dateStyle: "medium", timeStyle: "short" });
		default:
			return String(value);
	}
}

/**
 * `formatsPlugin()` — declarative per-column value formatting. Set `format` on any `GridColumn`
 * (see {@link CellFormat}); the plugin's `renderCell` formats only those columns and returns
 * `undefined` for the rest, so other plugins and the core default proceed. Null/undefined values
 * render as an empty string.
 *
 * Locale reactivity: `setup()` attaches a {@link LocaleController} to the host, so a runtime
 * `lang` change on the grid (or an ancestor) re-renders with the new locale. Place this plugin
 * AFTER structural/component plugins in the array — it is the fallback formatter.
 */
export function formatsPlugin(): DataGridPlugin {
	let ctrl: LocaleController | undefined;
	const localeFor = (ctx: DataGridContext) => ctrl?.locale ?? getLocale(ctx.host);

	return defineDataGridPlugin({
		name: "formats",
		setup(ctx) {
			ctrl = new LocaleController(ctx.host);
			// The controller is added mid-connect (renderRoot not yet created), so Lit won't fire
			// hostConnected for us — call it so the locale-change subscription is live now.
			ctrl.hostConnected();
			return () => {
				if (ctrl) { ctx.host.removeController(ctrl); ctrl.hostDisconnected(); ctrl = undefined; }
			};
		},
		renderCell(cell, ctx) {
			const fmt = ctx.host.columns.find((c) => c.id === cell.column.id)?.format;
			if (!fmt) return undefined;
			const value = cell.getValue();
			if (value === null || value === undefined) return "";
			return applyFormat(fmt, value, cell.row.original as Row, localeFor(ctx));
		},
	});
}

export default formatsPlugin;
