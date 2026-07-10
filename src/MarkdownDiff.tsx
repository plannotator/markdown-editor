import type { MutableRefObject } from "react";
import {
	AtomicDiffEditor,
	type AtomicDiffEditorHandle,
	type AtomicDiffEditorProps,
} from "@plannotator/atomic-editor";
import type { LanguageDescription } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import "@plannotator/atomic-editor/styles.css";
import "./styles/markdown-editor.css";
import { DEFAULT_CODE_LANGUAGES } from "./code-languages.js";
import { MarkdownSurface } from "./MarkdownSurface.js";

/** Imperative navigation and byte-inspection surface for a frozen Markdown diff. */
export type MarkdownDiffHandle = AtomicDiffEditorHandle;

/** Configuration for the themed, frozen Markdown comparison surface. */
export interface MarkdownDiffProps {
	/** The older document revision, preserved byte-for-byte. */
	readonly originalMarkdown: string;
	/** The newer document revision rendered as the main document, preserved byte-for-byte. */
	readonly modifiedMarkdown: string;
	/** Optional comparison identity. Change it to deliberately rebuild captured configuration. */
	readonly documentId?: string;
	/** Accessible label for the review region. Defaults to "Document changes". */
	readonly ariaLabel?: string;
	/** Color mode. Pass the host application's resolved mode. Defaults to dark. */
	readonly mode?: "dark" | "light";
	/** Whether to show the built-in change count and navigation. Defaults to true. */
	readonly showToolbar?: boolean;
	/** Whether to show the clickable change overview rail. Defaults to true. */
	readonly showOverview?: boolean;
	/** Whether to show the changed-line gutter. Defaults to true. */
	readonly gutter?: boolean;
	/** Whether small edits render deletions inline. Defaults to true. */
	readonly allowInlineDiffs?: boolean;
	/** Whether changed spans receive character/word emphasis. Defaults to true. */
	readonly highlightChanges?: boolean;
	/** Whether deleted fragments receive Markdown syntax highlighting. Defaults to true. */
	readonly syntaxHighlightDeletions?: boolean;
	/**
	 * Diff-algorithm safeguards. Captured by the mounted comparison; pass a stable object and
	 * change `documentId` when only this value changes.
	 */
	readonly diffConfig?: AtomicDiffEditorProps["diffConfig"];
	/**
	 * Fenced-code grammars. Defaults to `DEFAULT_CODE_LANGUAGES`. Captured by the mounted
	 * comparison; pass a stable array.
	 */
	readonly codeLanguages?: readonly LanguageDescription[];
	/**
	 * Extra CM6 extensions appended after the built-ins. Captured by the mounted comparison;
	 * pass a stable array and feed changing data through callbacks that close over live state.
	 */
	readonly extensions?: readonly Extension[];
	/** Handles rendered links while the document remains frozen. */
	readonly onLinkClick?: (url: string) => void;
	/** Receives the frozen view's navigation and byte-inspection handle. */
	readonly editorHandleRef?: MutableRefObject<MarkdownDiffHandle | null>;
	/**
	 * Constrains the complete diff surface, including its overview rail. `null` is unconstrained
	 * and is the default so the rail stays at the review pane's right edge.
	 */
	readonly maxWidth?: number | null;
	/** Extra class on the outer themed wrapper. */
	readonly className?: string;
	/** Extra class on the inner card. */
	readonly cardClassName?: string;
}

/**
 * Render two Markdown revisions as a themed, frozen unified diff. The component fills a
 * height-bounded parent and scrolls internally; it never exposes an editable document surface.
 */
export function MarkdownDiff({
	originalMarkdown,
	modifiedMarkdown,
	documentId,
	ariaLabel,
	mode = "dark",
	showToolbar,
	showOverview,
	gutter,
	allowInlineDiffs,
	highlightChanges,
	syntaxHighlightDeletions,
	diffConfig,
	codeLanguages,
	extensions,
	onLinkClick,
	editorHandleRef,
	maxWidth,
	className,
	cardClassName,
}: MarkdownDiffProps) {
	return (
		<MarkdownSurface
			variant="diff"
			defaultMaxWidth={null}
			mode={mode}
			maxWidth={maxWidth}
			className={className}
			cardClassName={cardClassName}
		>
			<AtomicDiffEditor
				originalMarkdown={originalMarkdown}
				modifiedMarkdown={modifiedMarkdown}
				documentId={documentId}
				ariaLabel={ariaLabel}
				showToolbar={showToolbar}
				showOverview={showOverview}
				gutter={gutter}
				allowInlineDiffs={allowInlineDiffs}
				highlightChanges={highlightChanges}
				syntaxHighlightDeletions={syntaxHighlightDeletions}
				diffConfig={diffConfig}
				codeLanguages={codeLanguages ?? DEFAULT_CODE_LANGUAGES}
				extensions={extensions}
				onLinkClick={onLinkClick}
				editorHandleRef={editorHandleRef}
			/>
		</MarkdownSurface>
	);
}
