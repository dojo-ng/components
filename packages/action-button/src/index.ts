import { DjActionButton } from "./dj-action-button.js";

export * from "./dj-action-button.js";
export { DjActionButton };
export default DjActionButton;

DjActionButton.define("dj-action-button", DjActionButton);

declare global {
	interface HTMLElementTagNameMap {
		"dj-action-button": DjActionButton;
	}
}
