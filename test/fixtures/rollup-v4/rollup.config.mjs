import pluginSbom from "rollup-plugin-sbom";
import pluginResolve from "rollup-plugin-node-resolve";
import pluginCommonJs from "rollup-plugin-commonjs";

/**
 * @type {import("rollup").RollupOptions}
 */
export default {
    input: "src/index.js",
    logLevel: "debug",
    output: {
        file: "dist/index.js",
        format: "iife"
    },
    perf: true,
    plugins: [
        pluginResolve({
            browser: true,
        }),
        pluginCommonJs(),
        pluginSbom({
            autodetect: true,
            generateSerial: true,
            includeWellKnown: true,
            outDir: "plugin-outdir",
            outFilename: "filename",
            outFormats: ["json", "xml"],
            saveTimestamp: true,
            supplier: {
                name: "Supplier Example Inc",
                url: ["https://example.com"],
                contact: [{
                    name: "Contact Name",
                    email: "example@example.com",
                    phone: "111-222-4444"
                }]
            },
            properties: [{
                name: "unique-key",
                value: "unique-value"
            }, {
                name: "duplicate-key",
                value: "duplicate-value-1"
            }, {
                name: "duplicate-key",
                value: "duplicate-value-2"
            }]
        })
    ]
}
