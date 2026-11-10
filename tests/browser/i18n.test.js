// CB23: components re-render when translations are registered or lazily loaded after they
// first rendered, and an underscore `lang` (en_US) no longer breaks the Intl helpers.
import { mount, cleanup, make, assertEqual } from "./helpers.js";
import { messages } from "../../packages/i18n/dist/index.js";
import "../../packages/alert/dist/index.js";

const closeLabel = (el) => el.renderRoot.querySelector("[part~='close']")?.getAttribute("aria-label");

describe("i18n: late translations (CB23)", () => {
	afterEach(() => {
		cleanup();
		messages.setLoader(undefined);
	});

	it("re-renders a mounted component when a bundle is registered afterwards", async () => {
		const host = make("div");
		host.setAttribute("lang", "sw");
		const el = make("dj-alert", { closable: true });
		host.append(el);
		await mount(host);
		await el.updateComplete;
		assertEqual(closeLabel(el), "Close", "English default before the bundle exists");

		messages.register("dj", "sw", { close: "Funga" });
		await new Promise((r) => setTimeout(r));
		await el.updateComplete;
		assertEqual(closeLabel(el), "Funga", "label should update without changing lang");
	});

	it("re-renders after messages.load() resolves through the fallback chain", async () => {
		messages.setLoader({ load: async (ns, locale) => (locale === "yo" ? { close: "Fermer" } : {}) });
		const host = make("div");
		host.setAttribute("lang", "yo-NG");
		const el = make("dj-alert", { closable: true });
		host.append(el);
		await mount(host);
		await el.updateComplete;
		assertEqual(closeLabel(el), "Close", "English default before loading");

		await messages.load("dj", "yo-NG");
		await new Promise((r) => setTimeout(r));
		await el.updateComplete;
		assertEqual(closeLabel(el), "Fermer", "base-language bundle should be loaded and shown");
	});
});
