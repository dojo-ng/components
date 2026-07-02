import { DjCard } from "./dj-card.js";
export * from "./dj-card.js"; export default DjCard;
DjCard.define("dj-card", DjCard);
declare global { interface HTMLElementTagNameMap { "dj-card": DjCard; } }
