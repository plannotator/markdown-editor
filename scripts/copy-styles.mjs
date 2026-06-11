// tsc doesn't copy assets — mirror src/styles into dist/styles after compile.
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
cpSync(`${root}src/styles`, `${root}dist/styles`, { recursive: true });
console.log("copied src/styles -> dist/styles");
