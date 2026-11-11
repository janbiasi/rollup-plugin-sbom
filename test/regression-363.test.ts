import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { rollup } from "rollup";

import pluginSbom from "../src/index";
import { PLUGIN_ID } from "../src/helpers";

// https://github.com/janbiasi/rollup-plugin-sbom/issues/363
describe("Regression #363 — tools which are not installed must not produce warnings", () => {
    let projectDir: string | undefined;

    afterEach(async () => {
        vi.restoreAllMocks();
        if (projectDir) {
            await rm(projectDir, { recursive: true, force: true });
        }
    });

    test("builds without plugin warnings when no bundler packages are installed", async () => {
        // the project must live outside of this repository, otherwise the bundlers
        // installed for development are resolved via the parent node_modules
        projectDir = await mkdtemp(join(tmpdir(), "rollup-plugin-sbom-363-"));
        await writeFile(join(projectDir, "package.json"), JSON.stringify({ name: "repro-363", version: "1.0.0" }));
        await writeFile(join(projectDir, "main.js"), "console.log('hello');\n");
        vi.spyOn(process, "cwd").mockReturnValue(projectDir);

        const warnings: string[] = [];
        const bundle = await rollup({
            input: join(projectDir, "main.js"),
            plugins: [pluginSbom()],
            onLog(level, log) {
                if (level === "warn" && log.plugin === PLUGIN_ID) {
                    warnings.push(log.message);
                }
            },
        });
        await bundle.generate({ format: "es" });
        await bundle.close();

        expect(warnings).toEqual([]);
    });
});
