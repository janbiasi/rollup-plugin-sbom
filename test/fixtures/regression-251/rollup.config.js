import pluginSbom from 'rollup-plugin-sbom';
import pluginNodeResolve from "@rollup/plugin-node-resolve";
import pluginJson from '@rollup/plugin-json';

export default {
    logLevel: "debug",
    input: ['index.js'],
    output: {
        dir: './dist',
        format: 'esm',
        preserveModules: true
    },
    plugins: [
        pluginNodeResolve({
            browser: true
        }),
        pluginJson(),
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
