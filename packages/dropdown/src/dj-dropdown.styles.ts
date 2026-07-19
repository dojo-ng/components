import { css } from "lit";
export default css`
	:host { display: inline-block; }
	:host([hidden]) { display: none; }
	.trigger { display: inline-block; }
	.panel { box-sizing: border-box; }
`;
