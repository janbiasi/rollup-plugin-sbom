import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
    entries: ["src/index"],
    externals: ["rollup"],
    clean: true,
    declaration: true,
    rollup: {
        emitCJS: true,
        inlineDependencies: true,
    },
});
