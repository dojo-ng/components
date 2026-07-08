/**
 * URL → embed matchers for `@dojo-ng/rich-text-embed`. Pure and dependency-free (no editor imports),
 * so they are unit-testable in isolation. A matcher inspects a URL and, if it recognizes it, returns
 * an {@link EmbedPayload}; `matchEmbed` tries a list in order and returns the first hit.
 */

/** The stored shape of an embed. `src` is a video id for youtube/vimeo, or the media URL otherwise. */
export interface EmbedPayload {
	kind: string;
	src: string;
	title?: string;
}

/** A named URL recognizer. `match` returns a payload when it recognizes `url`, else `undefined`. */
export interface EmbedMatcher {
	kind: string;
	match(url: string): EmbedPayload | undefined;
}

const YT_ID = /^[\w-]{6,20}$/;

/** Parse to a URL, rejecting anything that is not http(s) (blocks `javascript:`, `ftp:`, data URLs). */
function parseHttpUrl(url: string): URL | undefined {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return undefined;
	}
	return u.protocol === "http:" || u.protocol === "https:" ? u : undefined;
}

/** Hostname without a leading `www.`, lowercased. */
function host(u: URL): string {
	return u.hostname.replace(/^www\./, "").toLowerCase();
}

const youtube: EmbedMatcher = {
	kind: "youtube",
	match(url) {
		const u = parseHttpUrl(url);
		if (!u) return undefined;
		const h = host(u);
		let id: string | null = null;
		if (h === "youtu.be") {
			id = u.pathname.slice(1).split("/")[0] || null;
		} else if (h === "youtube.com" || h === "m.youtube.com" || h === "youtube-nocookie.com") {
			if (u.pathname === "/watch") {
				id = u.searchParams.get("v");
			} else {
				const m = /^\/(?:shorts|embed)\/([\w-]+)/.exec(u.pathname);
				if (m) id = m[1];
			}
		}
		return id && YT_ID.test(id) ? { kind: "youtube", src: id } : undefined;
	},
};

const vimeo: EmbedMatcher = {
	kind: "vimeo",
	match(url) {
		const u = parseHttpUrl(url);
		if (!u || host(u) !== "vimeo.com") return undefined;
		const m = /^\/(\d+)/.exec(u.pathname);
		return m ? { kind: "vimeo", src: m[1] } : undefined;
	},
};

const videoFile: EmbedMatcher = {
	kind: "video",
	match(url) {
		const u = parseHttpUrl(url);
		if (!u) return undefined;
		return /\.(mp4|webm|m3u8|mov)$/i.test(u.pathname) ? { kind: "video", src: url } : undefined;
	},
};

const audioFile: EmbedMatcher = {
	kind: "audio",
	match(url) {
		const u = parseHttpUrl(url);
		if (!u) return undefined;
		return /\.(mp3|m4a|ogg|wav|flac)$/i.test(u.pathname) ? { kind: "audio", src: url } : undefined;
	},
};

/**
 * The built-in matchers, tried in order: youtube, vimeo, direct video file, direct audio file. No
 * generic-iframe matcher ships — arbitrary iframes are a consumer decision (add your own matcher).
 */
export const defaultMatchers: EmbedMatcher[] = [youtube, vimeo, videoFile, audioFile];

/** Run `matchers` in order over `url`; return the first payload, or `undefined` if none match. */
export function matchEmbed(url: string, matchers: EmbedMatcher[] = defaultMatchers): EmbedPayload | undefined {
	for (const m of matchers) {
		const r = m.match(url);
		if (r) return r;
	}
	return undefined;
}

/** A canonical, working link for a payload (used by exportDOM's fallback anchor). */
export function embedHref(payload: EmbedPayload): string {
	if (payload.kind === "youtube") return `https://www.youtube.com/watch?v=${payload.src}`;
	if (payload.kind === "vimeo") return `https://vimeo.com/${payload.src}`;
	return payload.src;
}
