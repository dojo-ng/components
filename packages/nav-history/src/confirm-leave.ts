import type { Blocker } from "@dojo-ng/history/handle";
import { getLocale, messages, registerDefaults } from "@dojo-ng/i18n";
import "@dojo-ng/button";
import "@dojo-ng/dialog";
import type { DjDialog } from "@dojo-ng/dialog";

registerDefaults("dj", { leave: "Leave", stay: "Stay", leaveTitle: "Leave this page?" });

export interface ConfirmLeaveOptions {
	/** The dialog's title. Default: "Leave this page?", translated. */
	title?: string;
	/** The label of the button that lets the move go ahead. Default: "Leave", translated. */
	leaveText?: string;
	/** The label of the button that cancels the move. Default: "Stay", translated. */
	stayText?: string;
}

/**
 * A blocker for `history.block()` that asks the user before leaving: a modal `dj-dialog` with the
 * message and two buttons, Stay and Leave. Stay, Escape and the close button refuse the move, and
 * Leave allows it. Focus returns to where it was before the dialog opened.
 *
 * ```ts
 * const unblock = history.block(confirmLeave("You have unsaved changes."));
 * // later, after saving:
 * unblock();
 * ```
 *
 * The app decides when the page is dirty, by calling `block` then and `unblock` after saving. Stay
 * has focus when the dialog opens, so an extra Enter does not discard work. If the blocker is asked
 * again while the dialog is open (a second Back), the same dialog is reused.
 */
export function confirmLeave(message: string, options: ConfirmLeaveOptions = {}): Blocker {
	let pending: Promise<boolean> | undefined;
	return () => (pending ??= ask(message, options).finally(() => { pending = undefined; }));
}

function ask(message: string, options: ConfirmLeaveOptions): Promise<boolean> {
	return new Promise<boolean>((resolve) => {
		const dialog = document.createElement("dj-dialog") as DjDialog;
		const locale = getLocale(document.documentElement);
		const text = (key: string, fallback: string) => messages.resolve("dj", locale, key) ?? fallback;
		dialog.role = "alertdialog";
		dialog.setAttribute("data-confirm-leave", "");

		const title = document.createElement("span");
		title.slot = "title";
		title.textContent = options.title ?? text("leaveTitle", "Leave this page?");
		const body = document.createElement("p");
		body.textContent = message;
		const stay = button(options.stayText ?? text("stay", "Stay"), "contained");
		const leave = button(options.leaveText ?? text("leave", "Leave"), "text");
		dialog.append(title, body, stay, leave);

		let answered = false;
		const answer = (allow: boolean) => {
			if (answered) return;
			answered = true;
			dialog.open = false;
			// Let the dialog restore focus before it leaves the document.
			void dialog.updateComplete.then(() => {
				dialog.remove();
				resolve(allow);
			});
		};
		stay.addEventListener("click", () => answer(false));
		leave.addEventListener("click", () => answer(true));
		dialog.addEventListener("dj-close", () => answer(false));

		document.body.append(dialog);
		dialog.open = true;
	});
}

function button(label: string, kind: string): HTMLElement {
	const el = document.createElement("dj-button");
	el.slot = "actions";
	el.setAttribute("kind", kind);
	el.textContent = label;
	return el;
}
