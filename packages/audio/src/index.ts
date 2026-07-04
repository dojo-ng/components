import { DjAudio } from "./dj-audio.js";
export * from "./dj-audio.js";
export default DjAudio;
DjAudio.define("dj-audio", DjAudio);
declare global { interface HTMLElementTagNameMap { "dj-audio": DjAudio; } }
