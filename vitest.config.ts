import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// CM6's measure APIs need layout; happy-dom provides enough (the same
		// environment atomic-editor's own suite uses). jsdom does not.
		environment: "happy-dom",
		setupFiles: ["./test/setup.ts"],
		include: ["test/**/*.test.{ts,tsx}"],
		server: {
			deps: {
				// atomic-editor's published dist uses extensionless ESM imports,
				// which Node's resolver rejects — route it through Vite instead.
				inline: ["@atomic-editor/editor"],
			},
		},
	},
});
