// records.mjs — the records-manager demo. A dj-data-grid over 500 deterministic
// rows with sort, filtering, pagination, and multi-row selection; a per-row Edit
// button and a header Add both open a validated dj-dialog; the header "Delete
// selected" confirms through dj-popup-confirmation; mutations announce via
// dj-snackbar. No bundler: components load through the import map.
//
// Two positioning notes drive the layout: dj-popup uses position:fixed, which
// breaks inside a transformed ancestor. The edit dialog is transformed (centered),
// so its role/status controls are dj-native-select (no popup). Grid virtual rows
// are transformed too, so Delete confirmation lives in the sticky header, not in a
// row cell. Edit stays per-row because a plain dj-button needs no popup.

import { html } from "lit";
import "@dojo-ng/button";
import "@dojo-ng/icon";
import "@dojo-ng/text-input";
import "@dojo-ng/email-input";
import "@dojo-ng/native-select";
import "@dojo-ng/dialog";
import "@dojo-ng/popup-confirmation";
import "@dojo-ng/snackbar";
import "@dojo-ng/header";
import "@dojo-ng/loading-indicator";
import "@dojo-ng/data-grid";
import { cellComponentsPlugin } from "@dojo-ng/data-grid-cell-components";
import { formatsPlugin } from "@dojo-ng/data-grid-formats";
import { filterPlugin } from "@dojo-ng/data-grid-filter";
import { paginationPlugin } from "@dojo-ng/data-grid-pagination";
import {
	generateRecords, ROLE_OPTIONS, STATUS_OPTIONS,
	strings, currentLocale, setLocale, currentTheme, toggleTheme,
} from "./data.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const dialog = $("dialog");
const snackbar = $("snackbar");
const deleteConfirm = $("delete-confirm");

// --- State. `records` is the source of truth; the grid renders a copy. ---
let records = generateRecords();
let selected = []; // rows currently selected in the grid
let dialogMode = "add"; // "add" | "edit"
let editingId = null;
let toastTimer = 0;

// Stable row identity by id, so selection survives sort/filter/pagination/edits.
grid.getRowId = (row) => String(row.id);

// --- Columns. Rebuilt on locale change so headers localize; ids stay stable. ---
function buildColumns() {
	const t = strings();
	return [
		{ id: "name", header: t.name, filter: "text" },
		{ id: "email", header: t.email, filter: "text" },
		{ id: "role", header: t.role, filter: "select" },
		{ id: "department", header: t.department, filter: "select" },
		{ id: "status", header: t.status, filter: "select" },
		{ id: "joined", header: t.joined, format: { kind: "date", options: { dateStyle: "medium" } } },
		{ id: "balance", header: t.balance, format: { kind: "currency", currency: "USD" } },
		// Icon buttons: fixed-width and language-neutral, so the column never clips
		// when labels get longer in other locales.
		{ id: "actions", header: t.actions, sortable: false, width: "6rem", render: actionsCell },
	];
}

// Fixed-glyph icons (fill: currentColor via dj-icon), so nothing depends on text.
const PENCIL = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const XMARK = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

// The Actions cell: pencil = edit, X = delete (delete confirms in a per-row
// dj-popup-confirmation, which now positions via the top-layer popup fix). Each
// button carries a localized aria-label AND a native title (hover tooltip). The
// pencil stops click propagation so it doesn't also select the row; the delete
// confirmation stops propagation at the host so opening the popup doesn't either.
function actionsCell(_value, row) {
	const t = strings();
	const editLabel = `${t.edit} — ${row.name}`;
	const deleteLabel = `${t.delete} — ${row.name}`;
	return html`
		<div style="display:flex;gap:0.15rem;align-items:center">
			<dj-button
				kind="text"
				style="--dj-spacing-medium:0.4rem"
				aria-label=${editLabel}
				.title=${editLabel}
				@click=${(e) => { e.stopPropagation(); openEdit(row); }}
			><dj-icon slot="icon">${PENCIL}</dj-icon></dj-button>
			<dj-popup-confirmation
				confirm-label=${t.delete}
				cancel-label=${t.cancel}
				@click=${(e) => e.stopPropagation()}
				@dj-confirm=${() => removeRecord(row)}
			>
				<dj-button
					kind="text"
					style="--dj-spacing-medium:0.4rem"
					aria-label=${deleteLabel}
					.title=${deleteLabel}
				><dj-icon slot="icon">${XMARK}</dj-icon></dj-button>
				<span slot="content">${t.confirmDelete(row.name)}</span>
			</dj-popup-confirmation>
		</div>`;
}

// Remove one record (per-row X → confirmation → here).
function removeRecord(row) {
	records = records.filter((r) => r.id !== row.id);
	grid.data = records;
	selected = selected.filter((r) => r.id !== row.id);
	updateSelectionUI();
	toast(strings().deleted(row.name), "error");
}

grid.plugins = [
	cellComponentsPlugin(),
	formatsPlugin(),
	filterPlugin(),
	paginationPlugin({ pageSize: 10 }),
];
grid.columns = buildColumns();

// --- Simulated load: show the indicator for 600 ms, then fill the grid. ---
$("loading").active = true;
setTimeout(() => {
	grid.data = records;
	$("loading").active = false;
}, 600);

// --- Selection: drives the readout and the Delete-selected button state. ---
grid.addEventListener("dj-selection-change", (e) => {
	selected = e.detail.rows;
	updateSelectionUI();
});

function updateSelectionUI() {
	const de = currentLocale().startsWith("de");
	const n = selected.length;
	$("selection").textContent = n === 0
		? (de ? "Keine Zeilen ausgewählt." : "No rows selected.")
		: (de ? `${n} ausgewählt.` : `${n} selected.`);
	$("delete-selected").disabled = n === 0;
	$("delete-content").textContent = n === 0
		? (de ? "Keine Zeilen ausgewählt." : "No rows selected.")
		: (de ? `${n} Mitglied(er) löschen?` : `Delete ${n} member${n === 1 ? "" : "s"}?`);
}

// Don't open the confirmation popup when nothing is selected. Capture phase on the
// host runs before the trigger's own click handler inside the shadow root.
deleteConfirm.addEventListener("click", (e) => {
	if (selected.length === 0) e.stopPropagation();
}, true);

deleteConfirm.addEventListener("dj-confirm", () => {
	if (selected.length === 0) return;
	const ids = new Set(selected.map((r) => r.id));
	const count = ids.size;
	records = records.filter((r) => !ids.has(r.id));
	grid.data = records;
	selected = [];
	updateSelectionUI();
	toast(strings().deleted(count === 1 ? "1" : String(count)), "error");
});

// --- Dialog: Add and Edit share one form. ---
$("f-role").options = ROLE_OPTIONS;
$("f-status").options = STATUS_OPTIONS;

function openAdd() {
	const t = strings();
	dialogMode = "add";
	editingId = null;
	$("dialog-title").textContent = t.addTitle;
	$("f-name").value = "";
	$("f-email").value = "";
	$("f-role").value = ROLE_OPTIONS[0].value;
	$("f-status").value = STATUS_OPTIONS[0].value;
	dialog.open = true;
	queueFocus();
}

function openEdit(row) {
	const t = strings();
	dialogMode = "edit";
	editingId = row.id;
	$("dialog-title").textContent = t.editTitle;
	$("f-name").value = row.name;
	$("f-email").value = row.email;
	$("f-role").value = row.role;
	$("f-status").value = row.status;
	dialog.open = true;
	queueFocus();
}

function queueFocus() {
	requestAnimationFrame(() => $("f-name").focus?.());
}

function save() {
	// Validate before commit: reportValidity surfaces the native message and
	// blocks the save on an empty name or a malformed email.
	const nameOk = $("f-name").reportValidity();
	const emailOk = $("f-email").reportValidity();
	if (!nameOk || !emailOk) return;

	const values = {
		name: $("f-name").value.trim(),
		email: $("f-email").value.trim(),
		role: $("f-role").value,
		status: $("f-status").value,
	};
	const t = strings();

	if (dialogMode === "add") {
		const id = records.reduce((m, r) => Math.max(m, r.id), 0) + 1;
		const row = { id, ...values, department: "Operations", joined: new Date().toISOString(), balance: 0 };
		records = [row, ...records];
		grid.data = records;
		toast(t.added(row.name));
	} else {
		records = records.map((r) => (r.id === editingId ? { ...r, ...values } : r));
		grid.data = records;
		toast(t.saved(values.name));
	}
	dialog.open = false;
}

$("add").addEventListener("click", openAdd);
$("dialog-save").addEventListener("click", save);
$("dialog-cancel").addEventListener("click", () => { dialog.open = false; });
// Enter inside the form saves rather than reloading the page.
$("record-form").addEventListener("submit", (e) => { e.preventDefault(); save(); });

// --- Snackbar helper: show, then auto-dismiss. ---
function toast(message, type = "success") {
	snackbar.textContent = message;
	snackbar.type = type;
	snackbar.open = true;
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => { snackbar.open = false; }, 2500);
}

// --- Theme + locale switchers in the header. ---
$("theme").addEventListener("click", () => { toggleTheme(); applyStrings(); });

$("locale").value = currentLocale();
$("locale").addEventListener("change", (e) => {
	setLocale(e.target.value);
	applyStrings();
});

// Apply page strings and re-localize the grid headers + Edit cells.
function applyStrings() {
	const t = strings();
	$("title").textContent = t.title;
	$("add").textContent = t.add;
	$("delete-selected").textContent = t.deleteSelected;
	$("theme").textContent = t.theme;
	$("locale-label").textContent = t.locale;
	$("f-name").label = t.name;
	$("f-email").label = t.email;
	$("f-role").label = t.role;
	$("f-status").label = t.status;
	$("dialog-cancel").textContent = t.cancel;
	$("dialog-save").textContent = t.save;
	$("dialog-title").textContent = dialogMode === "add" ? t.addTitle : t.editTitle;
	deleteConfirm.confirmLabel = t.delete;
	deleteConfirm.cancelLabel = t.cancel;
	// New column array re-renders headers and the Edit cells (localized labels).
	grid.columns = buildColumns();
	updateSelectionUI();
}

applyStrings();
