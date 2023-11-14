import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import rollupPluginSbom from "rollup-plugin-sbom";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        rollupPluginSbom({
            generateSerial: true,
            saveTimestamp: true,
        }),
    ],
});
