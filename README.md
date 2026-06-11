# @plannotator/markdown-editor

Byte-faithful live-preview markdown editor for React — Obsidian-style editing where **the raw markdown text is the source of truth**. Built on [atomic-editor](https://github.com/kenforthewin/atomic-editor) (CodeMirror 6); rendering is decoration-only, so loading a document and reading it back is byte-identical, and a one-word edit produces a one-word diff.

Extracted from [Plannotator](https://github.com/backnotprop/plannotator)'s edit mode, where edits travel to AI agents as unified diffs — a workflow that breaks the moment an editor normalizes untouched markdown (bullet markers, escaping, spacing). This package exists to make that guarantee reusable and enforced by test.

## Install

```sh
pnpm add @plannotator/markdown-editor @atomic-editor/editor @codemirror/language react react-dom
# optional, for the default fenced-code grammar set:
pnpm add @codemirror/lang-javascript @codemirror/lang-python @codemirror/lang-json @codemirror/lang-yaml @codemirror/legacy-modes
```

## Use

```tsx
import { useRef } from "react";
import { MarkdownEditor, type MarkdownEditorHandle } from "@plannotator/markdown-editor";
import "@plannotator/markdown-editor/themes/plannotator.css"; // or your own theme

function Editor({ doc }: { doc: string }) {
	const handle = useRef<MarkdownEditorHandle | null>(null);
	return (
		// Must sit in a height-bounded parent — the editor fills it, scrolls internally.
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

Key semantics:

- **Uncontrolled after mount.** `markdown` is read once; the editor owns the text afterward. Read via `editorHandleRef.current.getMarkdown()`; swap documents by changing `documentId`.
- **`mode`**: pass your app's resolved `'dark' | 'light'`. The light palette switches via `data-theme="light"` on the wrapper.
- **`codeLanguages`**: defaults to a lean js/ts/python/json/yaml/shell set (`DEFAULT_CODE_LANGUAGES`). Pass your own `LanguageDescription[]` to change it. Note: bundlers with `inlineDynamicImports` (single-file builds) inline every listed grammar.
- **`className` / `cardClassName`**: extra classes on the wrapper / inner card for app-specific stacking, shadows, or padding.

## Theming

atomic-editor reads `--atomic-editor-*` CSS custom properties. Set them on `.pn-markdown-editor` or any ancestor. A ready-made mapping for the Plannotator design-token system (`--foreground`, `--card`, `--primary`, …) ships at `@plannotator/markdown-editor/themes/plannotator.css` — use it as the template for your own.

**Light-mode gotcha** (learned the hard way): atomic-editor declares its light palette directly _on_ `.atomic-cm-editor` under `[data-theme="light"]`, which out-specifies variables inherited from a wrapper. Any custom theme must re-declare its overrides under `.pn-markdown-editor[data-theme='light'] .atomic-cm-editor { ... }` or they silently lose in light mode. The bundled theme does this.

## The fidelity guarantee (test it in your app)

```ts
// vitest, environment: 'happy-dom' (jsdom won't work — CM6 needs layout)
import { roundTrip } from "@plannotator/markdown-editor/testing";

test("my corpus round-trips byte-identically", async () => {
	for (const doc of myDocuments) {
		expect(await roundTrip(doc)).toBe(doc);
	}
});
```

If this ever fails on your content, file an issue — it's the package's core contract. (Plannotator runs it against a 150-document sample of real plan history on every change.)

## Relationship to atomic-editor

This is a thin wrapper, on purpose: upstream is actively maintained and we want its fixes. The package boundary is the insurance policy — if upstream goes quiet for 6+ months, blocks a feature we need, or a required fix won't merge, we fork it into this org and swap the internal dependency; consumers see nothing. Until a trigger fires, don't fork.

## Development

```sh
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Conventions: oxlint + oxfmt (tabs, width 100), strict TypeScript, vitest + happy-dom. CI runs all gates on every PR.

## License

MIT
