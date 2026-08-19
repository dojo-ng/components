# Dojo NG quality assurance requirements

What we test, when it runs, what counts as pass or fail, and what happens on a failure. This is
the policy; setting up the runners and writing the tests is tracked separately. Where a check is
not yet wired up, it is marked as such.

## What we assure

A change is acceptable when it preserves all of these:

- Functional correctness: components behave as their API documents (properties, slots, events,
  form participation).
- Accessibility: WCAG 2.2 AA at the component level, including keyboard operation, focus
  management, accessible names, target size, forced-colors, and reduced motion.
- Browser support: the evergreen browsers plus Safari 15 and later (the stated baseline), on
  desktop and mobile viewports.
- Theming and direction: light, dark, and high-contrast tokens; forced-colors mode; left-to-right
  and right-to-left.
- Type safety and a clean build across the workspace.

## Test layers and tools

Five layers, fastest first. The two automated test tiers reflect the decision to run pure logic
in Node and component behavior in real browsers.

Static analysis. TypeScript type-checking through the workspace build (`tsc -b`), and ESLint for
code-quality and correctness rules. (ESLint: `npm run lint`.)

Logic unit tests (Vitest, Node). For the framework-agnostic logic that does not need a real DOM:
the `i18n` formatters, resolver, and locale chain; the `store` controller; `pubsub`; the focus
helpers (`isFocusWithin`, `trapTabKey`); the `context` registry. Fast, run on every change.
(Vitest: `npm run test:unit`; supersedes the interim ad-hoc happy-dom smoke scripts.)

Component and accessibility tests (@web/test-runner + Playwright). Real Chromium, Firefox, and
WebKit. This is where shadow DOM, focus, `:focus-visible`, forced-colors, `contenteditable` (rich
text), virtualization layout (data grid), and CSS media features are exercised faithfully. Each
component has behavior tests and an axe-core accessibility check. (WTR + Playwright + axe:
`npm run test:browser`; the relative performance gate is `npm run bench:components`.)

Build and package sanity. The workspace builds clean with `tsc -b`, and each package's published
entry imports without error.

Manual verification. The checks a headless or even automated environment cannot fully judge: a
screen-reader pass, keyboard walkthroughs, forced-colors and reduced-motion emulation, RTL layout,
and mobile-viewport usability. Required for new components and for any change touching focus,
motion, color, or layout.

## When each check runs

| Stage | Checks | Blocking |
|---|---|---|
| Local dev | Any layer, on demand | No |
| Pre-commit (fast) | Type-check, lint, affected logic unit tests | Yes |
| Merge request (CI) | Type-check, lint, all logic unit tests, component + axe tests on Chromium, build | Yes |
| Pre-release | The full CI suite, then build and a published-package import smoke | Yes |
| Default branch (post-merge) | Full suite including the cross-browser matrix; coverage report | Yes (keep the branch green) |

CI is the source of truth. The same gates live in the `.gitlab-ci.yml` on Heptapod and in the
Changesets release script. The cross-browser matrix (Firefox and WebKit, alongside Chromium) is
deliberately not a merge-request gate: it runs only on `branch/default`, after merge, so a
WebKit-only or Firefox-only break is caught there instead of blocking every merge request.

## Pass/fail criteria

- Type-check: zero errors.
- Lint: zero errors. Warnings are allowed but tracked and not left to accumulate.
- Logic unit tests: every test passes. No skipped or quarantined test without a linked issue.
- Component tests: every test passes, with no uncaught console errors or unhandled rejections
  during a run.
- Accessibility (axe-core): zero violations of `serious` or `critical` impact; `moderate` and
  `minor` are reported and triaged. WCAG 2.2 AA rule sets are enabled. A violation is a bug at the
  same severity as a functional defect.
- Cross-browser: the component suite is green on Chromium, Firefox, and WebKit. The Safari-15
  baseline is covered by WebKit plus manual checks on an older device when a change is risky there.
- Build: `tsc -b` is clean across all packages, and each package's `main`/`types` entry imports.
- Coverage: reported per package and watched for regressions, but there is no hard percentage
  gate (see below).

## Coverage policy

Coverage is a signal, not a gate. The real requirement is that every component has meaningful
behavior tests and an accessibility check, and every logic module has unit tests for its
contract and edge cases. We track coverage per package and investigate notable drops, but we do
not block a change on a global percentage, which tends to produce low-value tests for trivial UI
branches.

## What happens on a failure

- Pre-commit: the commit is blocked. Fix the issue before committing. Bypassing the hook is for
  genuine emergencies only and must be called out in the change description.
- Merge request: a red pipeline blocks the merge. The author fixes it; a green pipeline plus
  review approval is required to merge.
- Flaky tests: never blanket-skip. Quarantine the specific test with a linked tracking issue,
  investigate, and restore it. A test that cannot be made reliable is rewritten or removed with a
  recorded reason.
- Pre-release: any failure aborts the release. Nothing publishes on red.
- Regression found after release: treat as a priority fix. Reproduce it with a failing test first,
  fix it, ship a patch through a changeset, and keep the regression test.
- Accessibility failure: handled like any other defect. `serious`/`critical` block; anything that
  genuinely cannot be fixed is documented with a rationale in the component and the accessibility
  notes.

## Known limitations and manual-only areas

- CSS media features (forced-colors, `prefers-reduced-motion`, `prefers-color-scheme`) are checked
  through the browser runner's media emulation where supported, and otherwise by manual emulation
  in browser dev tools.
- Screen-reader output and real assistive-technology behavior are verified manually; automated
  axe checks catch structural and rule violations but not the lived experience.
- Older-Safari quirks are confirmed on a real device when a change is risky there, since WebKit in
  CI is not identical to a specific shipped Safari version.
- **Safari skips buttons in the tab order by default.** macOS Safari puts only form fields and
  links in sequential tab navigation unless "Press Tab to highlight each item on a webpage"
  (Safari → Settings → Advanced) or System Settings → Keyboard → Keyboard navigation is enabled.
  So a manual keyboard walkthrough in a default Safari will appear to skip every `<button>` —
  close buttons, icon buttons, menu triggers — and jump field to field. Before filing that as a
  component bug, enable the setting or repeat the walkthrough in Chrome/Firefox; a control being
  unreachable in *default* Safari is a browser policy, not a WCAG failure on our side. (Found
  2026-07-19 during the dj-search-box chip keyboard check.) What IS on us: any focusable control
  must show a visible focus indicator once it does receive focus — the same check surfaced a real
  missing `:focus-visible` ring on dj-chip's close button.

## Tooling status

The runners, configs, and per-component suites are in place. Type-check and build: `npm run build`
(`tsc -b`). Lint: `npm run lint`. Logic unit tests: `npm run test:unit` (Vitest). Component and
accessibility tests: `npm run test:browser` (@web/test-runner + Playwright + axe, on Chromium,
Firefox, and WebKit). Relative performance gate: `npm run bench:components`. A local pre-commit gate
(`scripts/precommit.sh` — type-check + lint + unit tests) is available to wire per clone; see the
components README. The CI wiring that runs these gates on every merge request still waits on the
repository going live on Heptapod.
