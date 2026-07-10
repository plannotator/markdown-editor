import { afterEach, describe, expect, test } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { MarkdownDiff, type MarkdownDiffHandle, type MarkdownDiffProps } from "../src/index.js";

interface MountedDiff {
	readonly handleRef: { current: MarkdownDiffHandle | null };
	readonly host: HTMLElement;
	readonly root: Root;
}

const mounts: MountedDiff[] = [];

async function mountDiff(props: MarkdownDiffProps): Promise<MountedDiff> {
	const host = document.createElement("div");
	host.style.width = "800px";
	host.style.height = "600px";
	document.body.appendChild(host);
	const handleRef: { current: MarkdownDiffHandle | null } = { current: null };
	const root = createRoot(host);
	await act(async () => {
		root.render(<MarkdownDiff {...props} editorHandleRef={handleRef} />);
	});
	const mounted = { handleRef, host, root };
	mounts.push(mounted);
	return mounted;
}

afterEach(async () => {
	const mountedDiffs = mounts.splice(0);
	await act(async () => {
		for (const mounted of mountedDiffs) {
			mounted.root.unmount();
		}
	});
	for (const mounted of mountedDiffs) {
		mounted.host.remove();
	}
});

describe("MarkdownDiff", () => {
	test("preserves both caller-owned revisions byte-for-byte in a frozen surface", async () => {
		const originalMarkdown = "# Before\r\n\r\nExact bytes.  \r\n";
		const modifiedMarkdown = "# After\r\n\r\nExact bytes.\t\r\n";
		const { handleRef, host } = await mountDiff({ originalMarkdown, modifiedMarkdown });

		expect(handleRef.current?.getOriginalMarkdown()).toBe(originalMarkdown);
		expect(handleRef.current?.getMarkdown()).toBe(modifiedMarkdown);
		expect(host.querySelector(".cm-content")?.getAttribute("contenteditable")).toBe("false");
		expect(host.querySelector<HTMLElement>(".pn-markdown-editor")?.style.maxWidth).toBe("");
	});

	test("owns diff layout policy while preserving host classes and theme", async () => {
		const { host } = await mountDiff({
			originalMarkdown: "Before",
			modifiedMarkdown: "After",
			mode: "light",
			maxWidth: 960,
			className: "host-surface",
			cardClassName: "host-card",
			showOverview: false,
		});

		const surface = host.querySelector<HTMLElement>(".pn-markdown-editor");
		expect(surface?.classList.contains("pn-markdown-diff")).toBe(true);
		expect(surface?.classList.contains("host-surface")).toBe(true);
		expect(surface?.dataset.theme).toBe("light");
		expect(surface?.style.maxWidth).toBe("960px");
		expect(
			host.querySelector(".pn-markdown-editor-card")?.classList.contains("host-card"),
		).toBe(true);
		expect(host.querySelector(".cm-atomic-diff-overview")).toBeNull();
	});

	test("forwards consumer extensions without letting them mutate the frozen document", async () => {
		const modifiedMarkdown = "Immutable review text.\r\n";
		const hostileExtension = ViewPlugin.define((view) => {
			queueMicrotask(() => {
				view.dispatch({ changes: { from: 0, insert: "MUTATED " } });
			});
			return {};
		});
		const { handleRef, host } = await mountDiff({
			originalMarkdown: "Earlier review text.\r\n",
			modifiedMarkdown,
			extensions: [
				EditorView.contentAttributes.of({ "data-diff-extension-probe": "alive" }),
				hostileExtension,
			],
		});
		await act(async () => Promise.resolve());

		expect(host.querySelector('[data-diff-extension-probe="alive"]')).not.toBeNull();
		expect(handleRef.current?.getMarkdown()).toBe(modifiedMarkdown);
		expect(handleRef.current?.getContentDOM()?.textContent).not.toContain("MUTATED");
	});
});
