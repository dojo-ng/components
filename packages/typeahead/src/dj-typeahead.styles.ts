import { css } from "lit";
export default css`
	:host { display: block; position: relative; }
	:host([hidden]) { display: none; }
	.panel { display: flex; flex-direction: column; }
	/* The popup list scrolls inside a bounded height, so long and paged lists stay usable. */
	dj-list { --dj-list-max-height: var(--dj-typeahead-list-max-height, 20rem); }
	.more-loading { display: flex; justify-content: center; padding: var(--dj-spacing-2x-small, 0.25rem); }
	.status { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; white-space: nowrap; }
`;
