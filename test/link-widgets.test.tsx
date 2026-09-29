/**
 * Engine 0.9.0's `linkWidgets()` seam composes through the wrapper's
 * `extensions` prop: a host widget draws in place of a `[text](url)` link,
 * the document bytes are untouched, and `refreshLinkWidgets` re-asks the
 * host without a document change. The engine owns the reveal rules and
 * tests them itself; this guards the wrapper path and the fidelity rule.
 */
import { describe, expect, test } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { EditorView, WidgetType } from "@codemirror/view";
import { linkWidgets, refreshLinkWidgets } from "@plannotator/atomic-editor";
import type { LinkWidgetLink } from "@plannotator/atomic-editor";
import { MarkdownEditor } from "../src/MarkdownEditor.js";
import type { MarkdownEditorHandle } from "../src/MarkdownEditor.js";

const DOC =
	"# Decisions\n\nDecided: [Ship on Friday](dec://42) today.\n\nSee [docs](https://example.com).\n";

class ChipWidget extends WidgetType {
	constructor(readonly text: string) {
		super();
	}

	override eq(other: ChipWidget): boolean {
		return other.text === this.text;
	}

	override toDOM(): HTMLElement {
		const span = document.createElement("span");
		span.className = "test-chip";
		span.textContent = this.text;
		return span;
	}
}

describe("linkWidgets through the wrapper", () => {
	test("draws the host widget, keeps the bytes, and re-asks on refresh", async () => {
		const known = new Set<string>();
		const match = (link: LinkWidgetLink) =>
			known.has(link.url) ? new ChipWidget(link.text) : null;
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
					documentId="link-widgets"
					editorHandleRef={handleRef}
					extensions={[linkWidgets({ match })]}
				/>,
			);
		});

		// Nothing known yet: the engine's own link look.
		expect(host.querySelector(".test-chip")).toBeNull();

		known.add("dec://42");
		const editorDom = host.querySelector<HTMLElement>(".cm-editor");
		const view = editorDom ? EditorView.findFromDOM(editorDom) : null;
		expect(view).not.toBeNull();
		await act(async () => {
			view?.dispatch({ effects: refreshLinkWidgets.of(null) });
		});

		const chips = host.querySelectorAll(".test-chip");
		expect(chips).toHaveLength(1);
		expect(chips[0]?.textContent).toBe("Ship on Friday");
		expect(chips[0]?.closest(".cm-atomic-link")).toBeNull();
		// The unmatched link keeps the engine look.
		expect(host.querySelector(".cm-atomic-link")?.textContent).toBe("docs");
		// The one inviolable rule: drawing a widget never touches the bytes.
		expect(handleRef.current?.getMarkdown()).toBe(DOC);

		await act(async () => {
			root.unmount();
		});
		host.remove();
	});
});
