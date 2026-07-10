# Handoff: @plannotator/markdown-editor

This document explains what the package is, how the editor works, and how Plannotator integrates it. Read this before touching the editor in either repo.

## What this is

A live-preview markdown editor for React, published to npm as `@plannotator/markdown-editor`. It wraps [atomic-editor](https://github.com/kenforthewin/atomic-editor) (CodeMirror 6). The raw markdown text is the source of truth. Rendering is decoration only, so loading a document and reading it back is byte-identical.

It powers Plannotator's edit mode (umbrella issue: backnotprop/plannotator#887, shipped in PR #890). It will also serve the Workspaces enterprise app and anything else that needs to edit markdown without corrupting it.

## Why it exists

Plannotator lets users edit a plan directly instead of only annotating it. On submit, the edits travel to the AI agent as a unified diff against the document the agent submitted. That design has one hard requirement: the diff must contain only what the user actually typed.

Most WYSIWYG markdown editors fail this. Milkdown, ProseMirror-based stacks, and BlockNote all parse markdown into a document model and regenerate markdown on save. Regeneration normalizes things the user never touched: `*` bullets become `-`, escaping changes, whitespace moves. A one-word edit produces a fifty-line diff, and the agent gets told to make changes the user never made. We evaluated Milkdown/Crepe, markamd, and Tolaria before choosing atomic-editor; the others were rejected on exactly this ground (Tolaria even has a file named `compact-markdown.ts` whose job is reformatting output).

atomic-editor takes the opposite approach. The CM6 document IS the markdown text. All rendering (headings, bold, tables, images, checkboxes) is view-layer decoration painted over the raw buffer. The only code paths that mutate text are explicit user actions: typing, a checkbox toggle that replaces exactly three characters, table edits that re-serialize only the table's own source range. We audited every mutation path before adopting it.

## How the editor works

### atomic-editor, in brief

- CM6 `EditorView` over the raw text. `getMarkdown()` is `state.doc.toString()`.
- Inline preview is a ViewPlugin: syntax tokens are hidden with view-only `Decoration.replace` on inactive lines and revealed on the cursor's line. Line heights never change between states, so there is no layout shift.
- Tables render as editable block widgets; images render as widgets below their source line. Both keep the markdown source intact.
- Fenced code blocks get lazy-loaded grammars via `LanguageDescription`.
- Light/dark switches on a `data-theme="light"` attribute on any ancestor.

### What the package adds

```
src/
├── index.ts            # Exports: MarkdownEditor, MarkdownDiff, types, defaults
├── MarkdownEditor.tsx  # The component
├── MarkdownDiff.tsx    # Frozen two-revision review surface
├── MarkdownSurface.tsx # Shared theme/layout frame
├── code-languages.ts   # Default grammar set: js/ts, python, json, yaml, shell
├── testing.tsx         # roundTrip() helper, exported at ./testing
└── styles/
    ├── markdown-editor.css     # Structural, theme-agnostic
    └── themes/plannotator.css  # Plannotator design-token mapping
```

Component semantics, the parts people get wrong:

- **Uncontrolled after mount.** The `markdown` prop is read once. After that the editor owns the text. Changing the prop does nothing; swap documents by changing `documentId`. Read current text through `editorHandleRef.current.getMarkdown()`.
- **`getMarkdown()` returns `''` (not null) from a destroyed view.** The handle ref is nulled on unmount, so optional chaining covers the normal case. Just don't cache the function.
- **The wrapper needs a height-bounded parent.** The editor fills it and scrolls internally, with a 40vh bottom runway like Obsidian.
- **`mode` is a prop**, not context. The package has no theme provider; the host passes its resolved `'dark' | 'light'`.
- **`codeLanguages` accepts `LanguageDescription[]`.** The defaults cover what plans contain. Bundlers with `inlineDynamicImports` (Plannotator's single-file build) inline every listed grammar, so the list stays lean.
- **`MarkdownDiff` is frozen and controlled by its two revisions.** Changing either text rebuilds
  the comparison. Its complete surface is unconstrained by default so the overview stays at the
  host pane edge; `maxWidth` constrains the document and rail together. Consumer extensions,
  language arrays, and custom diff config are captured by the mounted comparison.

### The fidelity contract

`test/fidelity.test.tsx` asserts `roundTrip(doc) === doc` for a set of PFM torture fixtures: frontmatter, `*` bullets, nested fences, escaped table pipes, trailing whitespace, hard breaks, directives, wiki-links. Plannotator additionally runs the same assertion against a 150-file sample of real plan history on every change (`DOM_TESTS=1 bun test markdownEditorFidelity`).

If any fidelity test fails, the change that broke it is wrong. Not the test. This is the package's reason to exist.

The helper is exported for consumers: `import { roundTrip } from '@plannotator/markdown-editor/testing'`. It needs happy-dom (jsdom lacks the layout APIs CM6 measures with) and `IS_REACT_ACT_ENVIRONMENT = true`.

### Theming, including the trap

atomic-editor reads `--atomic-editor-*` custom properties. Its dark defaults are inline fallbacks (`var(--x, #dcddde)`) at usage sites, so variables set on a wrapper win. Its light palette is different: declared directly ON `.atomic-cm-editor` under `[data-theme="light"]`, specificity (0,1,1), which BEATS variables inherited from a wrapper. Every theme must re-declare its overrides under `.pn-markdown-editor[data-theme='light'] .atomic-cm-editor` (0,2,1) or they silently lose in light mode. We shipped that bug once; the bundled theme now does this correctly. Code-token colors (`--atomic-editor-hl-*`) stay at library defaults on purpose, they ship correct palettes for both modes.

Two more hard-won details in the structural CSS:

- Card radius uses `--pn-markdown-editor-card-radius` (default 0.75rem), not `--atomic-editor-radius`, because that var also sizes editor internals like the table menu.
- `transition: none !important` on the editor DOM, because host apps (Plannotator included) animate color/background on `*` for theme switches, and CM6 mutates inline styles on every keystroke.

## How Plannotator integrates it

### The shim

`packages/ui/components/MarkdownEditor.tsx` in the monorepo is a ~40-line shim, not a copy. App.tsx renders `ThemeProvider` inside its own JSX, so App's body cannot call `useTheme()`. The shim sits beneath the provider, reads `resolvedMode`, and passes it as the package's `mode` prop. It also maps Plannotator's `gridEnabled` flag to `cardClassName` with the design-system Tailwind utilities (kept in the monorepo because that file is Tailwind-scanned; the package ships no Tailwind). App.tsx imports the shim, so the package swap changed zero call sites.

`bunfig.toml` lists `@plannotator/markdown-editor` in `minimumReleaseAgeExcludes`, the same first-party exception as `@pierre/diffs`. Without it, bun refuses any npm package younger than 7 days.

### The edit-mode state machine (packages/editor/App.tsx)

Three pieces of state matter:

- `originalMarkdownRef`: the as-submitted baseline. Set once when `/api/plan` loads (CRLF-normalized, because CM6 emits `\n` and a CRLF baseline would fabricate a whole-document diff). Never written by linked-doc navigation, message switching, or edit commits.
- `editedMarkdownRef`: the last committed editor text, null when no edits. Written in exactly one place, `commitMarkdownEdits`. The "Direct Edits" diff reads ONLY this (or the live buffer mid-edit), never the shared `markdown` state. This rule exists because `markdown` is repurposed by linked docs, archive browsing, and message switching; an early version diffed against it and could send the agent garbage instructing it to transform message 1 into message 2.
- `editGeneration`: bumped on each commit so the Viewer remounts. web-highlighter mutates the Viewer's DOM, and reconciling changed content against the mutated subtree throws.

The flow:

1. User clicks Edit (in the Wide/Focus switcher row, far right). `canEditMarkdown` gates it: hidden for HTML render, archive, goal setup, linked docs, plan diff, shared sessions, message/folder annotate modes, and after submit.
2. While editing, the Viewer is unmounted and the editor renders in its place. The annotation toolstrip and sticky header hide. Sidebar archive/file selection is blocked with a toast (those swap `markdown` under the editor). The plan-view row gets `flex-1 min-h-0` so the editor fills the remaining viewport exactly.
3. "Done" runs `commitMarkdownEdits`: read the buffer, update `editedMarkdownRef` and the `+N/-M` stats, `setMarkdown`, bump generation, remap each annotation's `blockId` against the re-parsed blocks (clearing stale `startMeta`/`endMeta` so positional restore can't highlight the wrong text), then repaint highlights with the REMAPPED objects and toast about any annotation whose text no longer exists. SSE external highlights get repainted via `resetExternalHighlights()`.
4. Committed edits appear as a pinned card at the top of the annotations sidebar (the panel auto-opens on desktop): `+N/-M`, an expandable inline diff, and a two-step discard that restores the baseline.
5. On submit, `composeFeedback()` prepends a "Direct Edits" section, a `createTwoFilesPatch` unified diff against the baseline, to the annotation feedback. It rides the existing channels (`/api/approve`, `/api/deny`, `/api/feedback`) with zero server changes, which is why it works on every runtime including plan mode where no file exists. When the source was converted (Jina/Turndown), the preamble says the diff describes desired content changes, not a file patch.
6. `hasDirectEdits` makes edits count as feedback everywhere annotations do: the Send Feedback button and Cmd+Enter route edits-only sessions through deny (the only Claude Code channel whose output carries feedback), the claude-code approve warning fires, and annotate gate-mode won't silently approve over unsent edits.

### Known limitations (tracked in backnotprop/plannotator#887)

- Edits don't survive a page refresh yet (draft persistence is Phase 2).
- Warning-dialog copy says "annotations" where it now also covers edits.
- Cmd+Enter is inert while focus is inside the editor (CM6 is contenteditable, the global submit guard treats it as a text field).
- PFM syntax (`:::callouts`, wiki-links, code-file links) renders as plain text inside the editor. The rendered view is unaffected. Editor decorations for PFM are Phase 2 work and should be authored in this package as CM6 extensions.
- The fidelity tests load and read but never type, so table-widget serialization (the one atomic-editor path that rewrites text ranges) is untested by us.

## Upstream policy

This package consumes `@plannotator/atomic-editor`, our narrow fork of atomic-editor. The fork is
reserved for editor-internal work the wrapper cannot express—parser extensions, CM6 state, widgets,
and the frozen merge view. Styling and host policy stay here first. Each substantive engine feature
lives on its own branch cut from upstream main so the fork remains a delta rather than a divergence.

There is also a parked idea: moving the CM6 packages from peerDependencies to regular dependencies for a fully self-contained install (v0.2.0). Decided "fine for now" since pnpm/npm/bun auto-install peers anyway.

## Pointers

- Package repo: https://github.com/plannotator/markdown-editor (CI: lint, format, typecheck, test, build)
- npm: `@plannotator/markdown-editor` (0.4.0)
- Feature PR: https://github.com/backnotprop/plannotator/pull/890
- Umbrella issue and roadmap: https://github.com/backnotprop/plannotator/issues/887
- Monorepo touch points: `packages/ui/components/MarkdownEditor.tsx` (shim), `packages/editor/App.tsx` (state machine, search for `commitMarkdownEdits`), `packages/ui/markdownEditorFidelity.test.tsx` (corpus test), `packages/ui/test-setup/happy-dom.ts` (opt-in DOM preload), `bunfig.toml` (release-age exception)
- Dev harness: `bun run dev:hook` in the monorepo, port 3000, demo plan with mocked API
