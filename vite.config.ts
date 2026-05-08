/// <reference types="vitest/config" />

import path from "node:path";
import { execSync } from "node:child_process";
import { type Plugin, defineConfig } from "vite";

const buildTypes: Plugin = {
    name: "build-types",
    buildEnd: (error) => {
        if (error) return;
        execSync("tsc -p ./tsconfig.build.json");
    },
};

const isModuleName = (id: string) => !id.startsWith(".") && !id.startsWith("\0") && !path.isAbsolute(id);

export default defineConfig({
    plugins: [buildTypes],
    build: {
        lib: {
            formats: ["es", "cjs"],
            entry: ["./src/index.ts"],
            fileName: (format) => (format === "es" ? "index.mjs" : "index.cjs"),
        },
        rolldownOptions: {
            external: isModuleName, // don't bundle dependencies
        },
    },
    test: {
        environment: "node",
    },
});
