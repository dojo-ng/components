// General defects CB24–CB28 and CB33, plus the CB1 position check, in a real browser.
// CB24: default-true booleans turn off from HTML. CB25: one Escape closes one overlay, dialog
// a11y, non-bubbling dj-close. CB26: dj-select focus return and revalidation. CB27: collapsed
// title-pane content is inert. CB28: tab-container keyboard/ARIA. CB33: tooltip describes its
// trigger, flips, and escapes clipping. CB1: popups land right inside transformed ancestors.
import { sendKeys } from "@web/test-runner-commands";
import { deepActiveElement } from "../../packages/dojo-element/dist/index.js";
import { mount, cleanup, make, assert, assertEqual, settleFrames } from "./helpers.js";
import { assertNoViolations } from "./a11y.js";
import "../../packages/dialog/dist/index.js";
import "../../packages/popup/dist/index.js";
import "../../packages/select/dist/index.js";
import "../../packages/dropdown/dist/index.js";
import "../../packages/list/dist/index.js";
import "../../packages/button/dist/index.js";
import "../../packages/tooltip/dist/index.js";
import "../../packages/title-pane/dist/index.js";
import "../../packages/tab-container/dist/index.js";
import "../../packages/alert/dist/index.js";
import "../../packages/trigger-popup/dist/index.js";
import "../../packages/text-input/dist/index.js";
import "../../packages/slide-pane/dist/index.js";

const OPTIONS = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Parse a snippet of HTML into the body and wait for every dj- element in it to render. */
async function html(markup) {
	const host = document.createElement("div");
	host.innerHTML = markup;
	document.body.append(host);
	await Promise.all([...host.querySelectorAll("*")].map((el) => el.updateComplete).filter(Boolean));
	return host;
}

describe("CB24: default-true booleans can be turned off from HTML", () => {
	afterEach(cleanup);

	it('reads "false" as false and anything else (or absence) as true', async () => {
		const host = await html(`
			<dj-dialog id="off" closeable="false" underlay="FALSE"></dj-dialog>
			<dj-dialog id="on" closeable="" underlay="true"></dj-dialog>
			<dj-dialog id="default"></dj-dialog>
			<dj-title-pane id="tp" closeable="false"></dj-title-pane>
			<dj-popup id="pp" scroll-lock="false"></dj-popup>
			<dj-trigger-popup id="tr" match-width="false"></dj-trigger-popup>`);
		const $ = (id) => host.querySelector("#" + id);
		assertEqual($("off").closeable, false, 'closeable="false"');
		assertEqual($("off").underlay, false, 'underlay="FALSE"');
		assertEqual($("on").closeable, true, 'closeable=""');
		assertEqual($("on").underlay, true, 'underlay="true"');
		assertEqual($("default").closeable, true, "no attribute keeps the default");
		assertEqual($("tp").closeable, false, "title-pane closeable");
		assertEqual($("pp").scrollLock, false, "popup scroll-lock");
		assertEqual($("tr").matchWidth, false, "trigger-popup match-width");
	});

	it('a reflected default-true prop starts closed with open="false" and removing the attribute turns it off', async () => {
		const host = await html(`<dj-alert id="a" open="false">Hi</dj-alert><dj-alert id="b">Hi</dj-alert>`);
		const a = host.querySelector("#a");
		const b = host.querySelector("#b");
		assertEqual(a.open, false, 'open="false" starts closed');
		assertEqual(b.open, true, "no attribute stays open");
		assert(b.hasAttribute("open"), "open reflects");
		b.removeAttribute("open");
		await b.updateComplete;
		assertEqual(b.open, false, "removing the attribute closes it");
	});
});

describe("CB25: one Escape closes one overlay; dialog a11y", () => {
	afterEach(cleanup);

	it("Escape closes a select's list inside a dialog first, then the dialog", async () => {
		const dialog = make("dj-dialog");
		const select = make("dj-select", { options: OPTIONS, label: "Pick" });
		dialog.append(select);
		await mount(dialog);
		let closes = 0;
		dialog.addEventListener("dj-close", () => closes++);
		dialog.open = true;
		await dialog.updateComplete;
		select.shadowRoot.querySelector('[part="trigger"]').click();
		await select.updateComplete;
		await settleFrames();
		assert(select.open, "the select opened");

		await sendKeys({ press: "Escape" });
		await select.updateComplete;
		await dialog.updateComplete;
		assertEqual(select.open, false, "first Escape closes the list");
		assertEqual(dialog.open, true, "the dialog stays open");
		assertEqual(closes, 0, "the select's popup closing does not reach the dialog's dj-close listener");

		await sendKeys({ press: "Escape" });
		await dialog.updateComplete;
		assertEqual(dialog.open, false, "second Escape closes the dialog");
		assertEqual(closes, 1, "one dj-close from the dialog");
	});

	it("Escape hides a tooltip inside a dialog without closing the dialog", async () => {
		const dialog = make("dj-dialog");
		dialog.innerHTML = `<dj-tooltip><button>Help</button><span slot="content">Hint</span></dj-tooltip>`;
		await mount(dialog);
		dialog.open = true;
		await dialog.updateComplete;
		const tip = dialog.querySelector("dj-tooltip");
		await tip.updateComplete;
		dialog.querySelector("button").focus();
		await tip.updateComplete;
		assertEqual(tip.shadowRoot.querySelector("[part=content]").hidden, false, "focus shows the tip");
		await sendKeys({ press: "Escape" });
		await tip.updateComplete;
		assertEqual(tip.shadowRoot.querySelector("[part=content]").hidden, true, "Escape hides the tip");
		assertEqual(dialog.open, true, "the dialog stays open");
	});

	it("dropdown emits one dj-close per close, and it does not bubble", async () => {
		const dd = make("dj-dropdown");
		const trigger = make("dj-button", { slot: "trigger" }, "Menu");
		const list = make("dj-list", { options: OPTIONS });
		dd.append(trigger, list);
		await mount(dd);
		let own = 0;
		let bubbled = 0;
		dd.addEventListener("dj-close", () => own++);
		document.addEventListener("dj-close", () => bubbled++, { once: true });
		dd.open = true;
		await dd.updateComplete;
		await settleFrames();
		await sendKeys({ press: "Escape" });
		await dd.updateComplete;
		assertEqual(dd.open, false, "Escape closes the dropdown");
		assertEqual(own, 1, "exactly one dj-close on the dropdown");
		assertEqual(bubbled, 0, "nothing reaches the document");
	});

	it("trigger-popup still emits dj-close on close", async () => {
		const tp = make("dj-trigger-popup");
		tp.innerHTML = `<button>Open</button><div slot="content">Body</div>`;
		await mount(tp);
		let closes = 0;
		tp.addEventListener("dj-close", () => closes++);
		tp.querySelector("button").click();
		await tp.updateComplete;
		await settleFrames();
		await sendKeys({ press: "Escape" });
		await tp.updateComplete;
		assertEqual(tp.open, false, "closed");
		assertEqual(closes, 1, "one dj-close");
	});

	it("is aria-modal, named by its title, and has one dialog role", async () => {
		const host = await html(`<dj-dialog role="alertdialog"><span slot="title">Delete file?</span><button>OK</button></dj-dialog>`);
		const dialog = host.querySelector("dj-dialog");
		dialog.open = true;
		await dialog.updateComplete;
		await settleFrames();
		const main = dialog.shadowRoot.querySelector("[part=dialog]");
		assertEqual(dialog.hasAttribute("role"), false, "the host role attribute is removed");
		assertEqual(dialog.role, "alertdialog", "the value moved to the property");
		assertEqual(main.getAttribute("role"), "alertdialog", "the inner element carries the role");
		assertEqual(main.getAttribute("aria-modal"), "true", "aria-modal true");
		assertEqual(main.getAttribute("aria-labelledby"), "title", "named by the title");
		await assertNoViolations(dialog);
	});

	it("a non-modal-click dialog is still aria-modal; with no title it takes the host aria-label", async () => {
		const dialog = make("dj-dialog");
		dialog.setAttribute("aria-label", "Settings");
		dialog.append(make("button", {}, "OK"));
		await mount(dialog);
		dialog.open = true;
		await dialog.updateComplete;
		const main = dialog.shadowRoot.querySelector("[part=dialog]");
		assertEqual(main.getAttribute("aria-modal"), "true", "aria-modal");
		assertEqual(main.getAttribute("aria-label"), "Settings", "host aria-label is passed on");
	});

	it("returns focus to a control inside a shadow root", async () => {
		const opener = make("dj-button", {}, "Open");
		const dialog = make("dj-dialog");
		dialog.append(make("button", {}, "OK"));
		document.body.append(opener, dialog);
		await opener.updateComplete;
		opener.focus();
		const inner = deepActiveElement();
		assert(inner && inner !== opener, "focus is on the inner native button");
		dialog.open = true;
		await dialog.updateComplete;
		dialog.close();
		await dialog.updateComplete;
		assert(deepActiveElement() === inner, "focus returns to the inner button");
	});

	it("slide-pane is aria-modal while open and returns focus on close", async () => {
		const opener = make("button", {}, "Open");
		const pane = make("dj-slide-pane");
		pane.append(make("button", {}, "Inside"));
		document.body.append(opener, pane);
		await pane.updateComplete;
		opener.focus();
		pane.open = true;
		await pane.updateComplete;
		assertEqual(pane.shadowRoot.querySelector("[part=pane]").getAttribute("aria-modal"), "true", "aria-modal");
		await sendKeys({ press: "Escape" });
		await pane.updateComplete;
		assertEqual(pane.open, false, "Escape closes it");
		assert(document.activeElement === opener, "focus returns to the opener");
	});
});

describe("CB26: dj-select focus and revalidation", () => {
	afterEach(cleanup);

	it("Escape and an outside click return focus to the trigger", async () => {
		const el = await mount(make("dj-select", { options: OPTIONS, label: "Pick" }));
		const trigger = el.shadowRoot.querySelector('[part="trigger"]');
		trigger.click();
		await el.updateComplete;
		await settleFrames();
		await sendKeys({ press: "Escape" });
		await el.updateComplete;
		assertEqual(el.open, false, "Escape closes");
		assert(el.shadowRoot.activeElement === trigger, "focus is back on the trigger after Escape");

		trigger.click();
		await el.updateComplete;
		await settleFrames();
		el.shadowRoot.querySelector("dj-popup").shadowRoot.querySelector("[part=underlay]").click();
		await el.updateComplete;
		assertEqual(el.open, false, "outside click closes");
		assert(el.shadowRoot.activeElement === trigger, "focus is back on the trigger after an outside click");
	});

	it("changing required revalidates at once", async () => {
		const el = await mount(make("dj-select", { options: OPTIONS, label: "Pick" }));
		assertEqual(el.checkValidity(), true, "valid while optional");
		el.required = true;
		await el.updateComplete;
		assertEqual(el.validity.valueMissing, true, "required with no value is invalid");
		el.required = false;
		await el.updateComplete;
		assertEqual(el.checkValidity(), true, "valid again once optional");
	});

	it("text-input revalidates when required or pattern changes", async () => {
		const el = await mount(make("dj-text-input", { label: "Code", value: "abc" }));
		assertEqual(el.checkValidity(), true, "valid at first");
		el.pattern = "[0-9]+";
		await el.updateComplete;
		assertEqual(el.validity.patternMismatch, true, "a new pattern applies at once");
		el.pattern = undefined;
		el.value = "";
		el.required = true;
		await el.updateComplete;
		assertEqual(el.validity.valueMissing, true, "required applies at once");
	});
});

describe("CB27: collapsed title-pane content", () => {
	afterEach(cleanup);

	it("is inert and invisible when closed, and the button controls it", async () => {
		const el = make("dj-title-pane", { name: "More" });
		el.append(make("button", {}, "Hidden action"));
		await mount(el);
		const region = el.shadowRoot.querySelector("[part=content]");
		const button = el.shadowRoot.querySelector("[part=button]");
		assertEqual(button.getAttribute("aria-controls"), region.id, "aria-controls points at the content");
		assert(region.inert, "closed content is inert");
		await wait(250);
		assertEqual(getComputedStyle(region).visibility, "hidden", "closed content is visibility:hidden");
		el.open = true;
		await el.updateComplete;
		assert(!region.inert, "open content is not inert");
		assertEqual(getComputedStyle(region).visibility, "visible", "open content is visible at once");
	});
});

describe("CB28: tab-container keyboard and ARIA", () => {
	afterEach(cleanup);

	function build(tabs, activeIndex = 0) {
		const el = make("dj-tab-container", { tabs, activeIndex });
		for (const t of tabs) el.append(make("div", {}, `Panel ${t.name}`));
		return el;
	}

	it("arrow keys skip disabled tabs", async () => {
		const el = await mount(build([{ name: "One" }, { name: "Two", disabled: true }, { name: "Three" }]));
		el.shadowRoot.querySelectorAll("[part=tab]")[0].focus();
		await sendKeys({ press: "ArrowRight" });
		await el.updateComplete;
		assertEqual(el.activeIndex, 2, "ArrowRight skips the disabled tab");
		await sendKeys({ press: "ArrowLeft" });
		await el.updateComplete;
		assertEqual(el.activeIndex, 0, "ArrowLeft skips it too");
	});

	it("an out-of-range activeIndex still leaves one tab stop", async () => {
		const el = await mount(build([{ name: "One", disabled: true }, { name: "Two" }], 7));
		const stops = [...el.shadowRoot.querySelectorAll("[part=tab]")].filter((t) => t.tabIndex === 0);
		assertEqual(stops.length, 1, "exactly one tab stop");
		assertEqual(stops[0].textContent.trim(), "Two", "on the first enabled tab");
	});

	it("Delete closes a closeable tab, Escape does not, and no button sits inside a tab", async () => {
		const el = await mount(build([{ name: "One", closeable: true }, { name: "Two" }]));
		const closed = [];
		el.addEventListener("dj-tab-close", (e) => closed.push(e.detail.index));
		const tab = el.shadowRoot.querySelectorAll("[part=tab]")[0];
		assertEqual(tab.querySelector('[role="button"]'), null, "no role=button inside the tab");
		assertEqual(tab.getAttribute("aria-keyshortcuts"), "Delete", "the shortcut is advertised");
		tab.focus();
		await sendKeys({ press: "Escape" });
		assertEqual(closed.length, 0, "Escape does not close");
		await sendKeys({ press: "Delete" });
		assertEqual(closed.join(), "0", "Delete closes tab 0");
		await assertNoViolations(el);
	});

	it("panels are labelled, controlled, and stay hidden against page display rules", async () => {
		const style = document.createElement("style");
		style.textContent = "dj-tab-container > div { display: block; }";
		document.head.append(style);
		try {
			const el = await mount(build([{ name: "One" }, { name: "Two" }]));
			await el.updateComplete;
			const panels = [...el.children];
			assertEqual(panels[1].getAttribute("aria-label"), "Two", "panel labelled by its tab name");
			assertEqual(getComputedStyle(panels[1]).display, "none", "inactive panel hidden despite page CSS");
			const tab = el.shadowRoot.querySelectorAll("[part=tab]")[1];
			if ("ariaControlsElements" in tab) assertEqual(tab.ariaControlsElements[0], panels[1], "tab controls its panel");
		} finally {
			style.remove();
		}
	});
});

describe("CB33: tooltip", () => {
	afterEach(cleanup);

	it("links the trigger to the tip with aria-describedby", async () => {
		const host = await html(`<dj-tooltip><button>Help</button><span slot="content">Useful hint</span></dj-tooltip>`);
		const button = host.querySelector("button");
		const tip = host.querySelector('[slot="content"]');
		assert(tip.id, "the tip got an id");
		assertEqual(button.getAttribute("aria-describedby"), tip.id, "trigger is described by the tip");
		await assertNoViolations(host.querySelector("dj-tooltip"));
	});

	it("escapes an overflow:hidden ancestor and flips when there is no room above", async () => {
		const host = await html(`
			<div style="position:fixed; top:0; left:40px; width:120px; height:30px; overflow:hidden; transform:translateZ(0)">
				<dj-tooltip orientation="top"><button>Help</button><span slot="content">A longer hint that would be clipped</span></dj-tooltip>
			</div>`);
		const tt = host.querySelector("dj-tooltip");
		tt.open = true;
		await tt.updateComplete;
		await settleFrames();
		const content = tt.shadowRoot.querySelector("[part=content]");
		if (!content.matches(":popover-open")) return; // no Popover API in this engine
		const r = content.getBoundingClientRect();
		const a = tt.getBoundingClientRect();
		assertEqual(content.dataset.placement, "bottom", "flipped to the bottom");
		assert(r.top >= a.bottom, "the tip sits below the trigger");
		assert(r.height > 0 && r.width > 0, "the tip is rendered, not clipped away");
	});
});

describe("CB1: popups inside transformed ancestors", () => {
	afterEach(cleanup);

	it("a popup in a transformed container lands at its anchor in viewport coordinates", async () => {
		const box = make("div");
		box.style.cssText = "position:absolute; top:200px; left:200px; transform:translate(30px, 40px); padding:10px";
		const anchor = make("button", {}, "Anchor");
		const popup = make("dj-popup");
		popup.append(make("div", {}, "Body"));
		box.append(anchor, popup);
		await mount(box);
		popup.anchor = anchor;
		popup.open = true;
		await popup.updateComplete;
		await settleFrames();
		const a = anchor.getBoundingClientRect();
		const w = popup.shadowRoot.querySelector(".wrapper").getBoundingClientRect();
		assert(Math.abs(w.top - a.bottom) <= 1, `popup top ${w.top} should meet anchor bottom ${a.bottom}`);
		assert(Math.abs(w.left - a.left) <= 1, `popup left ${w.left} should meet anchor left ${a.left}`);
	});

	it("a dj-select inside a dj-dialog opens its list right under the trigger", async () => {
		const dialog = make("dj-dialog");
		const select = make("dj-select", { options: OPTIONS, label: "Pick" });
		dialog.append(select);
		await mount(dialog);
		dialog.open = true;
		await dialog.updateComplete;
		const trigger = select.shadowRoot.querySelector('[part="trigger"]');
		trigger.click();
		await select.updateComplete;
		await settleFrames();
		const t = trigger.getBoundingClientRect();
		const w = select.shadowRoot.querySelector("dj-popup").shadowRoot.querySelector(".wrapper").getBoundingClientRect();
		assert(Math.abs(w.top - t.bottom) <= 1, `list top ${w.top} should meet trigger bottom ${t.bottom}`);
		assert(Math.abs(w.left - t.left) <= 1, `list left ${w.left} should meet trigger left ${t.left}`);
	});
});
