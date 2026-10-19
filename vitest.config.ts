import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The "@" alias is declared twice: here for Vitest, and in tsconfig.json "paths" for TypeScript.
// They are two separate resolvers; if only one knows "@", code type-checks but tests fail to import.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
