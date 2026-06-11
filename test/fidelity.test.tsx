/**
 * Fidelity guarantee: load → getMarkdown() is byte-identical. These fixtures
 * are the PFM torture set carried over verbatim from the Plannotator monorepo
 * (where an additional corpus test runs against real plan history).
 */
import { describe, test, expect } from "vitest";
import { roundTrip } from "../src/testing.js";

const FIXTURES: Record<string, string> = {
	"pfm-kitchen-sink": `---
title: Spike Plan
tags: [a, b]
---

# Heading *with emphasis*

Some text with **bold**, _underscore italic_, \`src/foo.ts:10-20\`, [[wiki-link]], #fff and #123.

:::note
A directive callout with ***nested* bold**.
:::

> [!WARNING]
> Alert content with a [link](https://example.com/path_(parens)).

* star bullet (not dash)
* second
  1. nested ordered
  2. with trailing spaces

| Col | Col2 |
| --- | ---- |
| a\\|b | *md* |

\`\`\`\`md
\`\`\`ts
nested fence
\`\`\`
\`\`\`\`

- [ ] task open
- [x] task done

text with trailing whitespace
and a hard\\
break — em…dash "quotes"
`,
	"mermaid-and-code": `# Diagram plan

\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|yes| C[Done]
\`\`\`

\`\`\`unknown-language
weird   spacing	and	tabs
\`\`\`

\`\`\`ts
const x: Record<string, number> = { 'a-b': 1 };
\`\`\`

Inline \`code with *asterisks*\` and an autolink https://example.com/a_(b) plus <https://angle.example>.
`,
	"whitespace-edges": `# Edge cases

paragraph with two trailing spaces
then a line

\t- tab-indented bullet
   - three-space bullet

> quote line one
> quote line two


triple blank lines above, none below`,
};

describe("markdown editor fidelity", () => {
	for (const [name, fixture] of Object.entries(FIXTURES)) {
		test(`fixture ${name}: load → getMarkdown is byte-identical`, async () => {
			const out = await roundTrip(fixture);
			expect(out).toBe(fixture);
		});
	}
});
