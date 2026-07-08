/**
 * The `extensions` prop must reach the underlying CodeMirror editor
 * verbatim. Proven end-to-end: a facet-based extension and a DOM-visible
 * extension both observable after mounting through the WRAPPER component
 * (not the engine directly — that's the seam this test guards).
 */
import { describe, expect, test } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { EditorView } from "@codemirror/view";
import { MarkdownEditor } from "../src/MarkdownEditor.js";
import type { MarkdownEditorHandle } from "../src/MarkdownEditor.js";

const DOC = "# Extension test\n\nBody.\n";

async function mountWithExtensions(extensions: readonly import("@codemirror/state").Extension[]) {
	const host = document.createElement("div");
	host.style.width = "600px";
	host.style.height = "400px";
	document.body.appendChild(host);
	const handleRef: { current: MarkdownEditorHandle | null } = { current: null };
	const root = createRoot(host);
	await act(async () => {
		root.render(
			<MarkdownEditor
				markdown={DOC}
				documentId="ext-test"
				editorHandleRef={handleRef}
				extensions={extensions}
			/>,
		);
	});
	return {
		host,
		handleRef,
		cleanup: async () => {
			await act(async () => {
				root.unmount();
			});
			host.remove();
		},
	};
}

describe("extensions passthrough", () => {
	test("a CM6 extension passed to the wrapper reaches the editor", async () => {
		// contentAttributes is a plain CM6 facet: if the attribute shows up in
		// the editor DOM, the extension made it into the EditorState that the
		// engine constructed — there is no other path to it.
		const { host, handleRef, cleanup } = await mountWithExtensions([
			EditorView.contentAttributes.of({ "data-extension-probe": "alive" }),
		]);
		expect(host.querySelector('[data-extension-probe="alive"]')).not.toBeNull();
		// Fidelity is unaffected by the passthrough itself.
		expect(handleRef.current?.getMarkdown()).toBe(DOC);
		await cleanup();
	});

	test("update listeners fire through the passthrough", async () => {
		// Second shape of extension (a ViewPlugin-style listener) to guard the
		// forwarding against being special-cased to attribute facets.
		const seen: string[] = [];
		const { handleRef, cleanup } = await mountWithExtensions([
			EditorView.updateListener.of((update) => {
				if (update.docChanged) seen.push(update.state.doc.toString());
			}),
		]);
		const view = handleRef.current ? EditorView.findFromDOM(document.body) : null;
		expect(view).not.toBeNull();
		await act(async () => {
			view!.dispatch({ changes: { from: 0, insert: "x" } });
		});
		expect(seen.length).toBe(1);
		expect(seen[0]?.startsWith("x# Extension test")).toBe(true);
		await cleanup();
	});

	test("omitting the prop leaves the editor untouched", async () => {
		const { handleRef, cleanup } = await mountWithExtensions([]);
		expect(handleRef.current?.getMarkdown()).toBe(DOC);
		await cleanup();
	});
});
