// @ts-check
import { defineConfig } from "rolldown";
import pluginSbom from "rollup-plugin-sbom";

export default defineConfig({
    input: "src/index.js",
    logLevel: "debug",
    output: {
        file: "dist/index.js",
        format: "iife"
    },
    plugins: [
        // sortLists is enabled by default
        pluginSbom({
            outDir: "plugin-outdir",
            outFilename: "bom",
            outFormats: ["json", "xml"],
            properties: [
                { name: "z-key", value: "z-value" },
                { name: "a-key", value: "a-value-2" },
                { name: "a-key", value: "a-value-1" },
            ],
        })
    ]
});
