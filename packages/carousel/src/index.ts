import { DjCarousel } from "./dj-carousel.js";
export * from "./dj-carousel.js"; export default DjCarousel;
DjCarousel.define("dj-carousel", DjCarousel);
declare global { interface HTMLElementTagNameMap { "dj-carousel": DjCarousel; } }
