import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.group { border: 0; margin: 0; padding: 0; min-inline-size: 0; }
	.legend { margin-bottom: var(--dj-spacing-x-small, 0.5rem); padding: 0; }
	.radios { display: flex; gap: var(--dj-spacing-small, 0.75rem); }
	.radios--vertical { flex-direction: column; }
	.radios--horizontal { flex-direction: row; flex-wrap: wrap; }
`;
