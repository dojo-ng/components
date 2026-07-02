import { DjAvatar } from "./dj-avatar.js";
export * from "./dj-avatar.js"; export default DjAvatar;
DjAvatar.define("dj-avatar", DjAvatar);
declare global { interface HTMLElementTagNameMap { "dj-avatar": DjAvatar; } }
