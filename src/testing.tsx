/**
 * Test helper for the package's core guarantee: mounting a document and
 * reading it back is BYTE-IDENTICAL. Consumers should run this against their
 * own document corpus — if it ever fails, diffs derived from editor output
 * would contain phantom changes the user never made.
 *
 * Requires a DOM (happy-dom works; see this repo's vitest.config.ts) and
 * `IS_REACT_ACT_ENVIRONMENT = true`.
 */
import { createRoot } from "react-dom/client";
import { act } from "react";
import { AtomicCodeMirrorEditor } from "@atomic-editor/editor";
import type { AtomicCodeMirrorEditorHandle } from "@atomic-editor/editor";

/** Mounts the editor with `markdown`, reads it back via getMarkdown(), unmounts. */
export async function roundTrip(markdown: string): Promise<string> {
	const host = document.createElement("div");
	host.style.width = "600px";
	host.style.height = "400px";
	document.body.appendChild(host);
	const handleRef: { current: AtomicCodeMirrorEditorHandle | null } = { current: null };
	const root = createRoot(host);
	await act(async () => {
		root.render(
			<AtomicCodeMirrorEditor markdownSource={markdown} editorHandleRef={handleRef} />,
		);
	});
	const out = handleRef.current?.getMarkdown() ?? "<<no handle>>";
	await act(async () => {
		root.unmount();
	});
	host.remove();
	return out;
}
