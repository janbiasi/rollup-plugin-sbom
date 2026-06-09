import { defineConfig } from "tsdown";
import sbom from "./src/index";

export default defineConfig({
    entry: "src/index.ts",
    platform: "node",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    plugins: [
        sbom({
            supplier: {
                contact: [{ name: "Jan Biasi" }],
                url: ["https://github.com/janbiasi/rollup-plugin-sbom"],
            },
        }),
    ],
});
