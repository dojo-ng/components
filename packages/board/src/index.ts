import { DjBoard } from "./dj-board.js";
export * from "./dj-board.js";
export * from "./apply-card-move.js";
export default DjBoard;
DjBoard.define("dj-board", DjBoard);
declare global { interface HTMLElementTagNameMap { "dj-board": DjBoard; } }
