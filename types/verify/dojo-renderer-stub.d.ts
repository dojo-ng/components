// Stand-in for @dojo-ng/framework's published JSX base types (its core/vdom.d.ts).
// The fork now ships those types (#125), but @dojo-ng/framework is a separate
// package, not a workspace dependency of components, so this harness mirrors the
// real `tsx.JSX` base here. Keep it in sync with framework/core/vdom.d.ts; drop it
// if @dojo-ng/framework is ever installed into this workspace.
declare module "@dojo-ng/framework" {
  export function tsx(tag: string, properties?: any, ...children: any[]): any;
  export namespace tsx.JSX {
    interface Element {}
    interface ElementAttributesProperty {
      __properties__: {};
    }
    interface IntrinsicElements {
      [tagName: string]: { key?: string | number; classes?: any; styles?: any; [k: string]: any };
    }
  }
}
