/** The palette's filter, as a decision that can be tested. Ported from NovelMaker's palette.js. */
import type { Command } from "@dojo-ng/commands";

type Searchable = Pick<Command, "label" | "group" | "keywords">;

const words = (text: string | undefined): string[] => String(text ?? "").toLowerCase().split(/\s+/).filter(Boolean);

function score(command: Searchable, first: string): number {
	const label = command.label.toLowerCase();
	if (label.startsWith(first)) return 0;
	if (words(label.replace(/[^\p{L}\p{N}]+/gu, " ")).some((word) => word.startsWith(first))) return 1;
	return 2;
}

/**
 * The commands that match `query`, best first. Every word typed must appear somewhere in the
 * command's group, label, or keywords, in any order, so "ref dec" finds "Reference · decisions".
 * Matches are ordered by how well the first word fits (the label starts with it, a word in the
 * label starts with it, anywhere else); equally good ones keep the order they were registered in.
 * An empty query is every command, as given.
 */
export function filterCommands<T extends Searchable>(commands: readonly T[], query: string): T[] {
	const wanted = words(query);
	if (wanted.length === 0) return [...commands];
	const matches: { command: T; index: number; rank: number }[] = [];
	commands.forEach((command, index) => {
		const haystack = `${command.group ?? ""} ${command.label} ${command.keywords ?? ""}`.toLowerCase();
		if (wanted.every((word) => haystack.includes(word))) matches.push({ command, index, rank: score(command, wanted[0]!) });
	});
	matches.sort((a, b) => a.rank - b.rank || a.index - b.index);
	return matches.map((m) => m.command);
}
