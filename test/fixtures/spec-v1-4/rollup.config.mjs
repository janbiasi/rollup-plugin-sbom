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
        pluginSbom({
            specVersion: "1.4",
            outDir: "plugin-outdir",
            outFilename: "bom",
            outFormats: ["json", "xml"],
        })
    ]
});
