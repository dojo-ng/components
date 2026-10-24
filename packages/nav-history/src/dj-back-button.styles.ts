import { css } from "lit";
export default css`
	:host { display: inline-block; }
	.arrow { display: block; width: 1.1em; height: 1.1em; }
	/* The arrow points back along the reading direction, so mirror it in right-to-left text. */
	.arrow--rtl { transform: scaleX(-1); }
`;
