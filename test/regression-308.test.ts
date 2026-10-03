import { describe, expect, test } from "vitest";
import { createOutputTestHelpers, getToolComponents } from "./test-helpers";

const helpers = createOutputTestHelpers("regression-308");

// https://github.com/janbiasi/rollup-plugin-sbom/issues/308
describe("Regression #308 — Non-deterministic order in tools", () => {
    const knownToolsOrder = ["rolldown", "rollup", "rollup-plugin-sbom", "vite"];

    test("tools should appear in deterministic order matching knownTools", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/tools-order.json");
        const tools = getToolComponents(metadata?.tools);
        const toolNames = tools.map((t) => t.name);

        const presentInOrder = knownToolsOrder.filter((name) => toolNames.includes(name));

        expect(toolNames).toEqual(presentInOrder);
    });

    test("tools should be registered without duplicates", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/tools-order.json");
        const tools = getToolComponents(metadata?.tools);
        const toolNames = tools.map((t) => t.name);
        const uniqueToolNames = [...new Set(toolNames)];

        expect(toolNames.length).toEqual(uniqueToolNames.length);
    });
});
