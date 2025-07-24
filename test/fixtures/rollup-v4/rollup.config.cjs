const pluginSbom = require("rollup-plugin-sbom");
const pluginResolve = require("rollup-plugin-node-resolve");
const pluginCommonJs = require("rollup-plugin-commonjs");

/**
 * @type {import("rollup").RollupOptions}
 */
module.exports = {
    input: "src/index.js",
    logLevel: "debug",
    output: {
        file: "dist/index.js",
        format: "iife"
    },
    perf: true,
    plugins: [
        pluginResolve({
            jsnext: true,
            main: true,
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
