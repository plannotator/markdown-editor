# @plannotator/markdown-editor

Live-preview markdown editor for React, built on [our fork](https://github.com/plannotator/atomic-editor) of [atomic-editor](https://github.com/kenforthewin/atomic-editor) (CodeMirror 6). The raw markdown text is the source of truth. Rendering is decoration only, so loading a document and reading it back is byte-identical. A one-word edit produces a one-word diff.

We pulled this out of [Plannotator](https://github.com/backnotprop/plannotator)'s edit mode, where user edits travel to AI agents as unified diffs. That workflow breaks the moment an editor normalizes markdown it didn't touch: bullet markers, escaping, spacing. This package makes the guarantee reusable and enforces it by test.

## Install

```sh
pnpm add @plannotator/markdown-editor
# optional, for the default fenced-code grammar set:
pnpm add @codemirror/lang-javascript @codemirror/lang-python @codemirror/lang-json @codemirror/lang-yaml @codemirror/legacy-modes
```

React and the CodeMirror packages are peer dependencies. pnpm, npm 7+, and bun install them automatically. They're peers (not bundled) because your app must share one copy of React and one copy of CM6 with the editor: the `codeLanguages` prop takes `LanguageDescription` objects you build from your own `@codemirror/language`, and CM6 breaks when two copies of `@codemirror/state` coexist.

## Use

```tsx
import { useRef } from "react";
import { MarkdownEditor, type MarkdownEditorHandle } from "@plannotator/markdown-editor";
import "@plannotator/markdown-editor/themes/plannotator.css"; // or your own theme

function Editor({ doc }: { doc: string }) {
	const handle = useRef<MarkdownEditorHandle | null>(null);
	return (
		// Needs a height-bounded parent. The editor fills it and scrolls internally.
		<div style={{ height: "80vh" }}>
			<MarkdownEditor
				markdown={doc}
				documentId="my-doc"
				editorHandleRef={handle}
				mode="dark"
				onLinkClick={(url) => window.open(url)}
			/>
		</div>
	);
}

// Read the current text whenever you need it:
const text = handle.current?.getMarkdown();
```

How it behaves:

- **Uncontrolled after mount.** `markdown` is read once, then the editor owns the text. Read it back with `editorHandleRef.current.getMarkdown()`. Swap documents by changing `documentId`.
- **`mode`**: pass your app's resolved `'dark' | 'light'`. The light palette switches via `data-theme="light"` on the wrapper.
- **`codeLanguages`**: defaults to a small js/ts/python/json/yaml/shell set (`DEFAULT_CODE_LANGUAGES`). Pass your own `LanguageDescription[]` to change it. Watch out: bundlers with `inlineDynamicImports` (single-file builds) inline every listed grammar.
- **`extensions`**: extra CodeMirror 6 extensions, forwarded verbatim to the editor and appended after its built-ins. This is the hook for live collaboration (e.g. `y-codemirror.next`), custom keymaps, or update listeners — the package stays provider-agnostic and ships no collaboration code of its own. Build extensions against your own CM6 packages (one shared copy of `@codemirror/state`, as above). Extensions that rewrite document text void the byte-fidelity guarantee; the contract covers what the editor itself does.

    The engine ships two opt-in UI extensions (atomic-editor ≥ 0.6.0) that plug straight in:

    ```tsx
    import { slashCommands, selectionToolbar } from "@plannotator/atomic-editor";

    <MarkdownEditor extensions={[slashCommands(), selectionToolbar()]} ... />
    ```

    `slashCommands()` is a Notion-style insert menu on `/` at the start of a line; `selectionToolbar()` is a floating bold/italic/strike/code/link bar over selected text (works multi-line and inside table cells). Both are themeable via the `--atomic-editor-menu-*` CSS variables and documented in the [atomic-editor changelog](https://github.com/plannotator/atomic-editor/blob/main/CHANGELOG.md).

- **`className` / `cardClassName`**: extra classes on the wrapper and inner card, for stacking, shadows, or padding your app needs.

## Theming

atomic-editor reads `--atomic-editor-*` CSS custom properties. Set them on `.pn-markdown-editor` or any ancestor. A ready-made mapping for the Plannotator token system (`--foreground`, `--card`, `--primary`, and so on) ships at `@plannotator/markdown-editor/themes/plannotator.css`. Copy it as the starting point for your own.

One gotcha that cost us a debugging session. atomic-editor declares its light palette directly on `.atomic-cm-editor` under `[data-theme="light"]`, which beats variables inherited from a wrapper. Your theme must re-declare its overrides under `.pn-markdown-editor[data-theme='light'] .atomic-cm-editor { ... }` or they silently lose in light mode. The bundled theme does this.

## The fidelity guarantee (test it in your app)

```ts
// vitest — full config below; jsdom won't work, CM6 needs layout
import { roundTrip } from "@plannotator/markdown-editor/testing";

test("my corpus round-trips byte-identically", async () => {
	for (const doc of myDocuments) {
		expect(await roundTrip(doc)).toBe(doc);
	}
});
```

```ts
// vitest.config.ts
export default defineConfig({
	test: {
		environment: "happy-dom",
		setupFiles: ["./setup.ts"], // must set: globalThis.IS_REACT_ACT_ENVIRONMENT = true
		server: {
			deps: {
				// Both packages must run through Vite: the editor's dist uses
				// extensionless ESM imports Node's resolver rejects, and once
				// Node loads this package natively the editor underneath is
				// loaded natively too.
				inline: ["@plannotator/markdown-editor", "@plannotator/atomic-editor"],
			},
		},
	},
});
```

If this fails on your content, file an issue. It's the package's core contract. Plannotator runs it against a 150-document sample of real plan history on every change.

## Relationship to atomic-editor

This is a thin wrapper over [`@plannotator/atomic-editor`](https://github.com/plannotator/atomic-editor), our fork of [atomic-editor](https://github.com/kenforthewin/atomic-editor). We forked because we needed parser-level changes the wrapper couldn't provide (first: YAML frontmatter support, which upstream misparses as a rule plus heading). The fork tracks upstream closely, and we offer our changes back as PRs — it's a delta, not a divergence.

## Development

```sh
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Conventions: oxlint and oxfmt (tabs, width 100), strict TypeScript, vitest with happy-dom. CI runs every gate on every PR.

## License

MIT
