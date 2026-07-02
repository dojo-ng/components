import { DjBreadcrumbGroup } from "./breadcrumb-group.js";
export * from "./breadcrumb-group.js"; export default DjBreadcrumbGroup;
DjBreadcrumbGroup.define("dj-breadcrumb-group", DjBreadcrumbGroup);
declare global { interface HTMLElementTagNameMap { "dj-breadcrumb-group": DjBreadcrumbGroup; } }
