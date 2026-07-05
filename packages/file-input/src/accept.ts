/**
 * Pure `accept` matching for `<dj-file-input>`, factored out so it can be unit-tested and reused
 * for both drop filtering and picker-result validation. Mirrors the `<input type="file" accept>`
 * grammar: a comma-separated list of extension tokens (`.png`), exact MIME types
 * (`application/pdf`), and `type/*` wildcards (`image/*`). An empty `accept` matches everything.
 */

/** Whether `file` satisfies the `accept` string. Empty/whitespace `accept` accepts all files. */
export function matchesAccept(file: { name: string; type: string }, accept: string | undefined): boolean {
	if (!accept || !accept.trim()) return true;
	const name = file.name.toLowerCase();
	const type = (file.type || "").toLowerCase();
	const tokens = accept
		.split(",")
		.map((t) => t.trim().toLowerCase())
		.filter(Boolean);
	if (tokens.length === 0) return true;
	return tokens.some((token) => {
		if (token.startsWith(".")) return name.endsWith(token);
		if (token.endsWith("/*")) {
			const prefix = token.slice(0, token.length - 1); // "image/*" -> "image/"
			return type.startsWith(prefix);
		}
		return type === token;
	});
}
