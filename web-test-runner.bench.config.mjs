// Config for the component performance gate (`npm run bench:components`). Separate from the
// behavior/a11y config so the bench runs on ONE engine (chromium) — a single baseline that three
// browsers won't fight over — and so a `bench-baseline` server command can read/write the
// checked-in JSON from Node (browser tests can't touch the filesystem). The default test:browser
// run excludes tests/browser/bench.test.js, so this is the only thing that runs it.
import { playwrightLauncher } from "@web/test-runner-playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASELINE = fileURLToPath(new URL("./tests/browser/bench-baseline.json", import.meta.url));

// Server-side command handler: the browser bench calls executeServerCommand("read-bench-baseline")
// and ("save-bench-baseline", results); this reads/writes the JSON on disk.
function benchBaselinePlugin() {
	return {
		name: "bench-baseline",
		executeCommand({ command, payload }) {
			if (command === "read-bench-baseline") {
				try {
					return JSON.parse(readFileSync(BASELINE, "utf8"));
				} catch {
					return {};
				}
			}
			if (command === "save-bench-baseline") {
				writeFileSync(BASELINE, `${JSON.stringify(payload, null, 2)}\n`);
				return true;
			}
			return undefined;
		},
	};
}

export default {
	files: ["tests/browser/bench.test.js"],
	nodeResolve: true,
	browsers: [playwrightLauncher({ product: "chromium" })],
	plugins: [benchBaselinePlugin()],
	testFramework: { config: { ui: "bdd", timeout: 60000 } },
};
