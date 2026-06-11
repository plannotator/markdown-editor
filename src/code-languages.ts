import { LanguageDescription, LanguageSupport, StreamLanguage } from "@codemirror/language";

/**
 * Default grammar set for fenced code blocks, trimmed to what technical plans
 * and docs actually contain. Each entry lazy-loads its grammar on first fence
 * match — but note that bundlers configured with `inlineDynamicImports` (e.g.
 * single-file builds) will inline every listed grammar, so keep this list lean
 * or pass your own via the `codeLanguages` prop.
 *
 * Requires the matching optional peer deps (@codemirror/lang-javascript, etc.).
 */
export const DEFAULT_CODE_LANGUAGES: readonly LanguageDescription[] = [
	LanguageDescription.of({
		name: "JavaScript",
		alias: ["js", "jsx", "javascript"],
		extensions: ["js", "jsx", "mjs", "cjs"],
		load: () => import("@codemirror/lang-javascript").then((m) => m.javascript({ jsx: true })),
	}),
	LanguageDescription.of({
		name: "TypeScript",
		alias: ["ts", "tsx", "typescript"],
		extensions: ["ts", "tsx"],
		load: () =>
			import("@codemirror/lang-javascript").then((m) =>
				m.javascript({ jsx: true, typescript: true }),
			),
	}),
	LanguageDescription.of({
		name: "Python",
		alias: ["py", "python"],
		extensions: ["py"],
		load: () => import("@codemirror/lang-python").then((m) => m.python()),
	}),
	LanguageDescription.of({
		name: "JSON",
		alias: ["json", "jsonc"],
		extensions: ["json"],
		load: () => import("@codemirror/lang-json").then((m) => m.json()),
	}),
	LanguageDescription.of({
		name: "YAML",
		alias: ["yml", "yaml"],
		extensions: ["yml", "yaml"],
		load: () => import("@codemirror/lang-yaml").then((m) => m.yaml()),
	}),
	LanguageDescription.of({
		name: "Shell",
		alias: ["sh", "bash", "zsh", "shell", "console"],
		extensions: ["sh"],
		load: () =>
			import("@codemirror/legacy-modes/mode/shell").then(
				(m) => new LanguageSupport(StreamLanguage.define(m.shell)),
			),
	}),
];
