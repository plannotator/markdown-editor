import { useMemo, type ReactNode } from "react";

interface MarkdownSurfaceProps {
	readonly children: ReactNode;
	readonly className?: string;
	readonly cardClassName?: string;
	readonly defaultMaxWidth: number | null;
	readonly maxWidth?: number | null;
	readonly mode: "dark" | "light";
	readonly variant: "editor" | "diff";
}

/** Shared themed, height-bounded frame for editable and frozen Markdown surfaces. */
export function MarkdownSurface({
	children,
	className,
	cardClassName,
	defaultMaxWidth,
	maxWidth,
	mode,
	variant,
}: MarkdownSurfaceProps) {
	const containerStyle = useMemo(() => {
		const resolvedMaxWidth = maxWidth === undefined ? defaultMaxWidth : maxWidth;
		return resolvedMaxWidth === null ? undefined : { maxWidth: resolvedMaxWidth };
	}, [defaultMaxWidth, maxWidth]);
	const variantClassName = variant === "diff" ? " pn-markdown-diff" : "";

	return (
		<div
			className={`pn-markdown-editor${variantClassName}${className ? ` ${className}` : ""}`}
			data-theme={mode === "light" ? "light" : undefined}
			style={containerStyle}
		>
			<div className={`pn-markdown-editor-card${cardClassName ? ` ${cardClassName}` : ""}`}>
				{children}
			</div>
		</div>
	);
}
