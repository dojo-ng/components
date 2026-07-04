import { DjVideo } from "./dj-video.js";
export * from "./dj-video.js";
export default DjVideo;
DjVideo.define("dj-video", DjVideo);
declare global { interface HTMLElementTagNameMap { "dj-video": DjVideo; } }
