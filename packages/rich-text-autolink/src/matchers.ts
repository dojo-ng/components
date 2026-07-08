/**
 * URL/email matchers for `@dojo-ng/rich-text-autolink`. Each `regex` is NON-global (a single
 * `exec` finds the earliest match); `url()` turns a matched substring into an href. Pure and
 * dependency-free so they are unit-testable in isolation.
 */
export interface AutoLinkMatcher {
	regex: RegExp;
	url(matched: string): string;
}

/**
 * Built-in matchers, tried in order; the earliest match in the text wins. URLs starting with `www.`
 * get an `https://` prefix; bare emails get `mailto:`.
 */
export const defaultMatchers: AutoLinkMatcher[] = [
	{
		regex: /(?:https?:\/\/|www\.)[^\s<>()]+/i,
		url: (m) => (/^www\./i.test(m) ? `https://${m}` : m),
	},
	{
		regex: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/,
		url: (m) => `mailto:${m}`,
	},
];
