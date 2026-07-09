# Onboarding: the Plannotator editor ecosystem

You are a senior engineer new to this codebase. This document is the map.
Read it top to bottom once; it routes you to the deeper per-repo docs and
tells you which of them are stale. State-of-the-world facts are in the
dated section at the bottom — trust `git log` and npm over that section
if they disagree.

## The one rule that outranks everything

**The editor must never change document text the user didn't type.**
Load a document → `getMarkdown()` is byte-identical, always. Rendering is
decoration painted over the raw text, never a parse→model→re-serialize
round trip.

Why it's inviolable: Plannotator ships user edits to AI agents as unified
diffs — the diff must contain only what the user typed. The Workspaces
enterprise app versions documents by **content SHA** — a single normalized
byte breaks their versioning. Every feature in this ecosystem was built
under this constraint, and it's enforced by tests (`test/fidelity.test.tsx`
here, corpus tests in consumers via the `./testing` export). If a change
makes a fidelity fixture fail, the change is wrong, not the fixture.

This is also why Milkdown/ProseMirror/BlockNote were evaluated and
rejected (empirically — we have the corrupted fixtures): they regenerate
markdown on save. See HANDOFF.md for that history.

## The four repos and how they relate

```
kenforthewin/atomic-editor (upstream, we don't own it)
        ▲  fork, kept as a clean delta
        │
~/oss/atomic-editor ──────────── @plannotator/atomic-editor   (the ENGINE)
        │  github.com/plannotator/atomic-editor, branch pn-main → remote main
        │  CM6 editor: inline preview, tables, frontmatter, wiki-links,
        │  slash commands, selection toolbar. npm, package manager: npm.
        ▼  peer dep
~/oss/markdown-editor ─────────── @plannotator/markdown-editor (the WRAPPER)
        │  THIS repo. Thin React wrapper: theming, fidelity contract,
        │  `extensions` passthrough. pnpm. You are probably here.
        ▼  dep
~/plannotator/plannotator ─────── the Plannotator MONOREPO (bun workspaces)
        │  packages/ui = @plannotator/ui: the shim + viewer components
        │  consumers import. Also apps/, packages/server, etc.
        ▼  consumed by
Workspaces (enterprise app, not on this machine)
           Pins exact versions. Import allowlist: may ONLY import
           @plannotator/ui — never atomic-editor directly. @plannotator/ui
           is the contract; everything they need is re-exported through it.
```

Layering discipline (which layer gets a change):
- **Wrapper/CSS first.** Styling and behavior workarounds go in the
  wrapper if the engine's public surface can express them.
- **Engine (fork) only for what editor internals alone can do** — parser
  changes, CM6 state fields, widgets.
- **packages/ui** for consumer-facing seams (re-exports, viewer props).

## Fork discipline (the engine repo)

We forked because frontmatter needed lezer parser changes the wrapper
couldn't reach. The fork must stay a **delta, not a divergence**:

- Every substantive feature lives on its own branch **cut from upstream
  `origin/main`**, independently PR-able to kenforthewin. Current
  branches: `frontmatter`, `frontmatter-properties`, `slash-commands`,
  `selection-toolbar`, `table-controls`, `wiki-link-resolved-labels`.
- The fork's `main` (local branch name: `pn-main`) = upstream main + those
  branches merged + one package-identity commit (name/version/repo only).
- Internal imports keep the `@atomic-editor/editor` string on purpose —
  it keeps upstream merges trivial.
- Merge upstream releases promptly; drop any branch upstream absorbs.

## What the engine ships (all opt-in extension factories unless noted)

- **Inline live preview** (core): syntax hidden on inactive lines,
  revealed at the cursor. Decoration-only.
- **Tables**: WYSIWYG block widget — in-place cell editing, right-click
  menu, hover `+` add-row/column straddling the edges, `⋯` handle,
  Linear-style visuals. Raw source reveals while the caret is on the
  table's LAST line (that's a corruption fix, not a bug — see gotchas).
- **Frontmatter** (core in fork): parsed as a dedicated node +
  Obsidian-style Properties widget (`frontmatterProperties()`).
- **`wikiLinks()`**: `[[target|label]]` rendering, `[[` autocomplete,
  async resolve, `preferResolvedLabel` (labeled links display the
  host-resolved current title; stored bytes untouched).
- **`slashCommands()`**: `/` at line start → insert menu, 12 defaults
  with hand-drawn SVG icons, custom items via config (`icon`, `snippet`,
  or an `apply` escape hatch).
- **`selectionToolbar()`**: floating bold/italic/strike/code/link bar.
  Byte-exact toggles (unwrap deletes exactly the marker bytes), works
  multi-line (per-line segments, one undo step) and inside table cells.

Theming: everything reads `--atomic-editor-*` CSS custom properties with
inline dark fallbacks; light mode is a variable remap under
`[data-theme="light"]`. Popup chrome (menus, toolbars, table menu) shares
seven `--atomic-editor-menu-*` tokens. No component library inside the
editor — hand-built DOM only. The wrapper's `themes/plannotator.css` is
the reference token mapping.

## Hard-won gotchas — do not rediscover these

Editor internals:
- **CM6 measures line boxes; padding is measured, margin is not.** Rhythm
  via padding on `.cm-line`, never margin. A margin on a widget once
  broke click routing for everything below it (0.1.1 changelog).
- **Plugin-sourced `Decoration.replace` may not cross line breaks**;
  block/multi-line decorations must come from a StateField.
- **An atomic block widget must never grow over the caret's line** —
  CM6's DOM selection loses its position and keystrokes land displaced
  (silent document corruption; found and fixed in the table widget,
  engine 0.7.0). The pattern: reveal raw source while the caret owns any
  line the widget would swallow.
- **CM6 tooltips flip only when the WINDOW runs out of room, not the
  editor.** We clamp `tooltips({ tooltipSpace })` to the editor rect
  (bundled inside `selectionToolbar()`); first-config-wins on merge.
- **Autocomplete: never use `override`** — it throws config-merge
  conflicts with any second source and suppresses everything else.
  Register through `EditorState.languageData`, and build the source
  closure ONCE — a fresh closure per read makes CM6 drop in-flight async
  results (wiki-suggestions went silently dead from exactly this).
- **Window event listeners in editor UI belong in the capture phase** —
  contenteditable islands (table cells) and host apps stop propagation.
- **`tooltip.create` is compared by reference** — hoist one stable
  closure per extension instance or the DOM tears down every update.
- The table context menu mounts on `document.body`, OUTSIDE the editor
  DOM — it copies resolved `--atomic-editor-menu-*` values from the
  editor element at open time. Any new body-mounted UI needs the same.

Wrapper/theming:
- The engine's **light palette is declared ON `.atomic-cm-editor`**
  (specificity 0,1,1) so wrapper-level variables LOSE in light mode.
  Themes must re-declare under
  `.pn-markdown-editor[data-theme='light'] .atomic-cm-editor`.
- Card radius uses `--pn-markdown-editor-card-radius`, deliberately NOT
  `--atomic-editor-radius` (that sizes editor internals).
- The `transition: none` exemption exists because hosts animate on `*`
  and CM6 mutates inline styles per keystroke.

Consumer seams:
- **`extensions` is captured ONCE per `documentId`** by the engine.
  Swapping the array later is silently ignored until remount. Config
  callbacks may close over live state. Documented loudly on every layer.
- Consumers must share ONE copy of `@codemirror/state` — two copies break
  CM6 undetectably. That's why everything CM6 is a peer dep.
- Consumer vitest needs happy-dom (NOT jsdom — CM6 needs layout),
  `IS_REACT_ACT_ENVIRONMENT = true`, and
  `server.deps.inline: ["@plannotator/markdown-editor", "@plannotator/atomic-editor"]`.

Monorepo:
- bun workspaces, `bunfig.toml` `linker = "isolated"`. **Never `bun add`
  inside a package dir** — edit package.json by hand, `bun install` from
  the root. `minimumReleaseAge` delays fresh npm packages EXCEPT the two
  editor packages (excluded).
- macOS: never `cp` over a running compiled binary (kernel signature
  cache → SIGKILL). `rm` first, then copy, then
  `codesign --force -s -`.

## How we verify (the quality bar)

1. **Byte-exact test assertions.** Formatting/insert tests assert the
   FULL document string before and after — never `contains()`.
2. **Unit tests lie about UI.** happy-dom can't do layout, pointer-event
   flows, or async tooltip timing. Every UI change gets a real-browser
   pass (Playwright is a devDep of the engine; demo: `npm run dev` in
   the engine repo). The wiki-suggestions regression shipped through 62
   green unit tests and was caught only in Chromium. Budget for both.
3. **Regression tests must be non-vacuous** — prove the test fails on
   the old code before trusting it.
4. Gates per repo (run before/after, never attribute pre-existing
   failures to yourself):
   - engine: `npm ci && npm run typecheck && npm test && npm run build`
   - wrapper: `pnpm install && pnpm lint && pnpm format:check &&
     pnpm typecheck && pnpm test && pnpm build`
   - monorepo: root `bun run typecheck`, `bun test`, package-specific
     scripts (read `packages/ui/HANDOFF.md`).

## Parallel work conventions

Multiple agents work simultaneously via **git worktrees** — one feature
branch per worktree, physically disjoint directories, zero file overlap.
Known shared-file merge points (engine: `src/index.ts`, `CHANGELOG.md`,
`demo/App.tsx`) are kept minimal/additive and resolved at integration by
whoever merges. Current worktrees: `git worktree list` in the engine repo.
Dev-server ports: 5173 is ALWAYS taken (an unrelated codiff server holds
`[::1]:5173` — a vite instance will happily double-bind the IPv4 side and
confuse your browser). Demo convention: pn-main on 5180, worktrees use
5181+, always `--strictPort`.

## Publishing (who can do what)

**Only Michael can publish to npm** (and push where auth is gated).
Agents prepare everything — versions, changelogs, tags, gates — and hand
over exact commands. Flows:
- engine: `npm version X.Y.Z` (prepublishOnly runs gates) → user runs
  `npm publish`. Push: `git push plannotator pn-main:main <branches> <tag>`.
- wrapper: `pnpm version` → user runs `pnpm publish`. Push: origin main.
- ui: manual per `packages/ui/HANDOFF.md` — `bun pm pack` (resolves
  `workspace:*`) then `npm publish *.tgz --provenance --access public`,
  core before ui. No CI publish job.
After any publish: clean-room verification — registry metadata + fresh
consumer install + functional smoke from the published artifact.

## Reading list (order matters)

1. This file.
2. `CLAUDE.md` in each repo you touch (short, binding).
3. `HANDOFF.md` here — deep dive on the wrapper and the editor's
   internals. **Predates the fork**: where it says we wrap kenforthewin's
   package directly or evaluates alternatives, read it as history.
4. Engine `CHANGELOG.md` — the best feature-by-feature tour that exists,
   including the WHY of every fix.
5. `packages/ui/HANDOFF.md` in the monorepo — shim architecture, publish
   flow, consumer constraints.

## State of the world — 2026-07-09 (verify before trusting)

- Published on npm: engine 0.5.1, wrapper 0.3.0, ui 0.26.0.
- Tagged + pushed, **awaiting Michael's publish**: engine **0.7.0**
  (tables pass, corruption fix, preferResolvedLabel; 0.6.0 is a git-only
  tag, superseded before publish), wrapper **0.3.2** (peer widened;
  0.3.1 likewise skipped).
- Monorepo: branch `feat/ui-wiki-link-seams` (7 commits, unpushed) —
  ui 0.27.0: `extensions` passthrough on the shim, wikiLinks re-export,
  `resolveLinkedDoc` on InlineMarkdown, two TS6133 fixes retiring a
  Workspaces patch. Lockfile relocks after the npm publishes.
- Enterprise (Workspaces) greenlit ask in flight: ID-based wiki-links
  with viewer-side title resolution. Engine + ui work done (above);
  their reply goes out after publish verification. Known follow-up:
  `resolveLinkedDoc` is on `InlineMarkdown` only, not threaded through
  the `Viewer` chain.
- Separate older thread: monorepo branch `feat/review-editor-base-ui`
  (Radix→Base UI migration of packages/review-editor, 10+ commits,
  unpushed) — awaiting Michael's manual QA sign-off. A QA build replaced
  `~/.local/bin/plannotator` (backup: `plannotator.pre-baseui-backup`).
- Upstream PR candidates ready on the fork (each a clean branch):
  frontmatter, frontmatter-properties, slash-commands, selection-toolbar,
  table-controls (incl. the corruption fix), wiki-link-resolved-labels.
  None offered yet.

## Day-one checklist

1. Read this file + the two CLAUDE.md files (wrapper, engine).
2. Engine: `cd ~/oss/atomic-editor && npm ci && npm test` (expect ~240
   green) and `npm run dev -- --port 5180 --strictPort` → click through:
   `/` menu, select text (bubble bar), hover a table, type `[[`.
3. Wrapper: `cd ~/oss/markdown-editor && pnpm install && pnpm test`.
4. Monorepo: read `packages/ui/HANDOFF.md`; root `bun install` only if
   you must (lockfile is intentionally pinned pre-publish right now).
5. Skim the engine CHANGELOG end to end.
6. Before your first change, ask: which layer does this belong to, does
   it touch document bytes (almost certainly it must not), and does it
   need a browser pass (if it renders anything: yes).
