import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sbom from 'rollup-plugin-sbom';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        rollupOptions: {
            logLevel: "debug"
        }
    },
    plugins: [
        react(),
        sbom({
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
            properties: [
                {
                    name: "unique-key",
                    value: "unique-value"
                },
                {
                    name: "duplicate-key",
                    value: "duplicate-value-1"
                },
                {
                    name: "duplicate-key",
                    value: "duplicate-value-2"
                }
            ]
        })
    ]
})
