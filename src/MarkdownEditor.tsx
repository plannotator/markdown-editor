import type { MutableRefObject } from "react";
import { useMemo } from "react";
import { AtomicCodeMirrorEditor } from "@atomic-editor/editor";
import type { AtomicCodeMirrorEditorHandle } from "@atomic-editor/editor";
import type { LanguageDescription } from "@codemirror/language";
import "@atomic-editor/editor/styles.css";
import "./styles/markdown-editor.css";
import { DEFAULT_CODE_LANGUAGES } from "./code-languages.js";

export type MarkdownEditorHandle = AtomicCodeMirrorEditorHandle;

export interface MarkdownEditorProps {
	/** Initial markdown. Read at mount only — the editor owns the text after that.
	 *  Read the current text via editorHandleRef.current.getMarkdown(). */
	markdown: string;
	/** Identity key; change to remount with new content. */
	documentId: string;
	editorHandleRef: MutableRefObject<MarkdownEditorHandle | null>;
	/** Color mode. atomic-editor switches palettes via [data-theme="light"] on an
	 *  ancestor; pass your app's resolved mode here. Default: dark. */
	mode?: "dark" | "light";
	onMarkdownChange?: (markdown: string) => void;
	onLinkClick?: (url: string) => void;
	/** Fenced-code grammars. Defaults to DEFAULT_CODE_LANGUAGES (js/ts, python,
	 *  json, yaml, shell — requires the matching optional peer deps). Unknown
	 *  fence languages fall back to plain monospace. */
	codeLanguages?: readonly LanguageDescription[];
	/** Constrains the editor column. null = unconstrained. Default: 832. */
	maxWidth?: number | null;
	/** Extra class on the outer wrapper (e.g. stacking-context utilities). */
	className?: string;
	/** Extra class on the inner card (e.g. shadow / border / inline padding). */
	cardClassName?: string;
}

/**
 * Byte-faithful live-preview markdown editor.
 *
 * The raw markdown text is the source of truth: rendering is decoration-only
 * (CodeMirror 6 via atomic-editor), so loading a document and reading it back
 * is byte-identical, and a one-word edit produces a one-word diff. See
 * `@plannotator/markdown-editor/testing` for the round-trip assertion helper.
 *
 * The wrapper must sit in a height-bounded parent — the editor fills it and
 * scrolls internally.
 */
export function MarkdownEditor({
	markdown,
	documentId,
	editorHandleRef,
	mode = "dark",
	onMarkdownChange,
	onLinkClick,
	codeLanguages,
	maxWidth,
	className,
	cardClassName,
}: MarkdownEditorProps) {
	const containerStyle = useMemo(
		() => (maxWidth === null ? undefined : { maxWidth: maxWidth ?? 832 }),
		[maxWidth],
	);

	return (
		<div
			className={`pn-markdown-editor${className ? ` ${className}` : ""}`}
			data-theme={mode === "light" ? "light" : undefined}
			style={containerStyle}
		>
			<div className={`pn-markdown-editor-card${cardClassName ? ` ${cardClassName}` : ""}`}>
				<AtomicCodeMirrorEditor
					documentId={documentId}
					markdownSource={markdown}
					editorHandleRef={editorHandleRef}
					onMarkdownChange={onMarkdownChange}
					onLinkClick={onLinkClick}
					codeLanguages={codeLanguages ?? DEFAULT_CODE_LANGUAGES}
				/>
			</div>
		</div>
	);
}
