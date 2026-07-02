import { DjButton } from "./dj-button.js";

export * from "./dj-button.js";
export { DjButton };
export default DjButton;

// Importing this package registers <dj-button>. Safe to import many times.
DjButton.define("dj-button", DjButton);

declare global {
	interface HTMLElementTagNameMap {
		"dj-button": DjButton;
	}
}
