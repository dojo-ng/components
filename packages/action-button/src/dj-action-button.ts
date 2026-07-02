import DjButton from "@dojo-ng/button";

/**
 * `<dj-action-button>` — a button that inherits the surrounding theme rather than
 * imposing its own. Mirrors the Dojo `action-button`, which renders `Button` with
 * `variant="inherit"`. Because --dj-* tokens inherit through the shadow boundary,
 * subclassing DjButton with no token overrides already yields inherited theming.
 */
export class DjActionButton extends DjButton {
	static override version = "0.1.0";
}

export default DjActionButton;
