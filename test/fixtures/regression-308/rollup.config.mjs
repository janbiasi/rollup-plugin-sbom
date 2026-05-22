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
            autodetect: true,
            outDir: "plugin-outdir",
            outFilename: "tools-order",
            outFormats: ["json"],
        })
    ]
});
