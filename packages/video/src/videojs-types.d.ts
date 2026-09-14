// Minimal LOCAL declaration for video.js — only the surface dj-video uses.
//
// video.js is NOT installed in the sandbox (and npm may 403), so this lets the
// package type-check and build without the real dependency. REPLACE this file
// with video.js's bundled types (or `@types/video.js`) once `npm install` has
// pulled video.js in — do not keep hand-maintaining this surface.

declare module "video.js" {
	export interface VideoJsSource {
		src: string;
		type?: string;
	}

	export interface VideoJsOptions {
		controls?: boolean;
		autoplay?: boolean;
		muted?: boolean;
		loop?: boolean;
		poster?: string;
		sources?: VideoJsSource[];
		tracks?: unknown[];
		[key: string]: unknown;
	}

	export interface VideoJsPlayer {
		dispose(): void;
		src(source?: string | VideoJsSource | VideoJsSource[]): string | void;
		poster(url?: string): string | void;
		on(event: string, handler: (...args: unknown[]) => void): void;
		paused(): boolean;
		play(): Promise<void> | void;
		pause(): void;
		currentTime(): number;
		duration(): number;
		el(): Element;
	}

	const videojs: (el: HTMLElement, options?: VideoJsOptions) => VideoJsPlayer;
	export default videojs;
}
