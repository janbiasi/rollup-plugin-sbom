import { describe, expect, test } from "vitest";
import { createOutputTestHelpers } from "./test-helpers";

const helpers = createOutputTestHelpers("regression-320");

// https://github.com/janbiasi/rollup-plugin-sbom/issues/320
describe("Regression #320 — CommonJS build must work correctly", () => {
    test("creates SBOM successfully", async () => {
        const content = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        console.dir(content);

        expect(content).toBeTruthy();
        expect(content.metadata?.tools).toBeDefined();
        expect(content.metadata.tools.length).toEqual(3);
    });
});
