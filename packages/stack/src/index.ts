import { DjStack } from "./stack.js";
export * from "./stack.js"; export default DjStack;
DjStack.define("dj-stack", DjStack);
declare global { interface HTMLElementTagNameMap { "dj-stack": DjStack; } }
