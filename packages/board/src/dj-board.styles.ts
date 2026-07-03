import { css } from "lit";
export default css`
	:host { display: block; }
	:host([hidden]) { display: none; }
	.board {
		display: flex;
		align-items: flex-start;
		gap: var(--dj-board-gap, 1rem);
		overflow-x: auto;
	}
`;
