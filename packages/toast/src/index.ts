import { DjToaster } from "./dj-toaster.js";
export * from "./dj-toaster.js";
export { toast, getToaster } from "./toast.js";
export type { ToastFunction, ToastPromiseMessages } from "./toast.js";
export type { ToastType, ToastAction, ToastOptions, ToastUpdate, ToastHandle, ToastEntry } from "./queue.js";
export { matchesShortcut } from "./shortcut.js";
export default DjToaster;
DjToaster.define("dj-toaster", DjToaster);
declare global { interface HTMLElementTagNameMap { "dj-toaster": DjToaster; } }
