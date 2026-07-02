import type { ReactiveController, ReactiveControllerHost } from "lit";
import { getLocale, getDir, onLocaleChange } from "./locale.js";

/**
 * A Lit reactive controller that tracks the host's effective locale and direction and
 * re-renders the host when either changes. It reads `lang`/`dir` from the nearest ancestor
 * that sets them, so no provider element is required.
 *
 * ```ts
 * #i18n = new LocaleController(this);
 * render() { return html`${formatDate(this.value, this.#i18n.locale)}`; }
 * ```
 */
export class LocaleController implements ReactiveController {
	private host: ReactiveControllerHost & HTMLElement;
	private dispose?: () => void;

	locale: string;
	dir: "ltr" | "rtl";

	constructor(host: ReactiveControllerHost & HTMLElement) {
		this.host = host;
		this.locale = getLocale(host);
		this.dir = getDir(host);
		host.addController(this);
	}

	hostConnected(): void {
		this.sync();
		this.dispose = onLocaleChange(() => this.sync());
	}

	hostDisconnected(): void {
		this.dispose?.();
		this.dispose = undefined;
	}

	private sync(): void {
		const locale = getLocale(this.host);
		const dir = getDir(this.host);
		if (locale !== this.locale || dir !== this.dir) {
			this.locale = locale;
			this.dir = dir;
			this.host.requestUpdate();
		}
	}
}
