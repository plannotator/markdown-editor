# @plannotator/markdown-editor

Live-preview markdown editor for React, built on [atomic-editor](https://github.com/kenforthewin/atomic-editor) (CodeMirror 6). The raw markdown text is the source of truth. Rendering is decoration only, so loading a document and reading it back is byte-identical. A one-word edit produces a one-word diff.

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
- **`className` / `cardClassName`**: extra classes on the wrapper and inner card, for stacking, shadows, or padding your app needs.

## Theming

atomic-editor reads `--atomic-editor-*` CSS custom properties. Set them on `.pn-markdown-editor` or any ancestor. A ready-made mapping for the Plannotator token system (`--foreground`, `--card`, `--primary`, and so on) ships at `@plannotator/markdown-editor/themes/plannotator.css`. Copy it as the starting point for your own.

One gotcha that cost us a debugging session. atomic-editor declares its light palette directly on `.atomic-cm-editor` under `[data-theme="light"]`, which beats variables inherited from a wrapper. Your theme must re-declare its overrides under `.pn-markdown-editor[data-theme='light'] .atomic-cm-editor { ... }` or they silently lose in light mode. The bundled theme does this.

## The fidelity guarantee (test it in your app)

```ts
// vitest, environment: 'happy-dom' (jsdom won't work, CM6 needs layout)
import { roundTrip } from "@plannotator/markdown-editor/testing";

test("my corpus round-trips byte-identically", async () => {
	for (const doc of myDocuments) {
		expect(await roundTrip(doc)).toBe(doc);
	}
});
```

If this fails on your content, file an issue. It's the package's core contract. Plannotator runs it against a 150-document sample of real plan history on every change.

## Relationship to atomic-editor

This is a thin wrapper, on purpose. Upstream is actively maintained and we want its fixes. The package boundary is the insurance: if upstream goes quiet for 6+ months, blocks a feature we need, or won't merge a fix we require, we fork it into this org and swap the internal dependency. Consumers see nothing. Until one of those happens, we don't fork.

## Development

```sh
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Conventions: oxlint and oxfmt (tabs, width 100), strict TypeScript, vitest with happy-dom. CI runs every gate on every PR.

## License

MIT
