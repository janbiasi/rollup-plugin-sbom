import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sbom from 'rollup-plugin-sbom';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), sbom({
    autodetect: true,
    generateSerial: true,
    includeWellKnown: true,
    outDir: "plugin-outdir",
    outFilename: "filename",
    outFormats: ["json", "xml"],
    saveTimestamp: true
  })],
})
