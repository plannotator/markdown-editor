# @plannotator/markdown-editor

React wrapper around atomic-editor (CodeMirror 6) providing a byte-faithful live-preview markdown editor. Extracted from Plannotator's edit mode; consumed by the Plannotator monorepo and the Workspaces enterprise app.

## The one inviolable rule

**The editor must never change document text the user didn't type.** Load → `getMarkdown()` is byte-identical, always. Every feature, theme, or extension added here must preserve this — it's enforced by `test/fidelity.test.tsx` and consumers' corpus tests via the `./testing` export. If a change makes any fixture fail, the change is wrong, not the fixture.

## Structure

```
src/
├── index.ts            # Public exports: MarkdownEditor, types, DEFAULT_CODE_LANGUAGES
├── MarkdownEditor.tsx  # The component — thin, uncontrolled-after-mount wrapper
├── code-languages.ts   # Default lazy-loaded grammar set (lean on purpose)
├── testing.tsx         # roundTrip() helper — the fidelity assertion, exported at ./testing
└── styles/
    ├── markdown-editor.css     # Structural, theme-agnostic (wrapper + card + transition exemption)
    └── themes/plannotator.css  # Plannotator design-token mapping (the reference theme)
```

## Conventions (mirrors the Workspaces repo)

- pnpm, TypeScript strict (`verbatimModuleSyntax`, 6.x), ESM only
- oxlint + oxfmt: tabs, printWidth 100 — run `pnpm format` before committing
- vitest + happy-dom (NOT jsdom — CM6's measure APIs need layout)
- Build: `tsc -p tsconfig.build.json` + `scripts/copy-styles.mjs` → `dist/`
- CI gates: lint, format:check, typecheck, test, build

## Theming gotchas (hard-won, do not rediscover)

- atomic-editor's **dark** defaults are inline `var(--x, fallback)` at usage sites → wrapper-level variables win. Its **light** palette is declared ON `.atomic-cm-editor` under `[data-theme="light"]` (specificity 0,1,1) → wrapper variables LOSE. Themes must re-declare under `.pn-markdown-editor[data-theme='light'] .atomic-cm-editor` (0,2,1).
- Card radius uses `--pn-markdown-editor-card-radius` (default 0.75rem), deliberately NOT `--atomic-editor-radius` (that sizes editor internals like the table menu).
- The `transition: none` exemption exists because host apps commonly animate color/background on `*`; CM6 mutates inline styles per keystroke.

## Upstream policy

atomic-editor is a single-maintainer project we deliberately did NOT fork — it's alive and we want its fixes. Fork triggers (then swap the dependency internally; consumers unaffected): upstream silent >6 months, blocks a needed feature, or a required fix won't merge. Until then, workarounds live in this package's CSS/wrapper, never in patched node_modules.

## Releasing

`pnpm version` + `pnpm publish` (prepublishOnly runs all gates). Public package under the @plannotator npm scope.
