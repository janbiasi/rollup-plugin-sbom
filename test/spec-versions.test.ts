/**
 * Important: Please take a look at the test fixture documentation before altering tests.
 */

import { describe, expect, test } from "vitest";
import { assertLegacyToolsList, createOutputTestHelpers, getToolComponents } from "./test-helpers";

describe.concurrent("Spec v1.7", () => {
    const helpers = createOutputTestHelpers("spec-v1-7");

    test("it should emit metadata.tools as components", async () => {
        const { specVersion, metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/bom.json");

        expect(specVersion).toEqual("1.7");
        expect(getToolComponents(metadata?.tools)).toContainEqual(
            expect.objectContaining({ type: "application", name: "rolldown", version: expect.any(String) }),
        );
    });

    test("it should emit metadata.tools as components in XML", async () => {
        const { bom } = await helpers.getCompiledFileXMLContent("plugin-outdir/bom.xml");

        expect(bom.metadata?.tools).toHaveProperty("components");
        expect(bom.metadata?.tools).not.toHaveProperty("tool");
    });
});

describe.concurrent("Spec v1.4", () => {
    const helpers = createOutputTestHelpers("spec-v1-4");

    test("it should emit metadata.tools as legacy list", async () => {
        const { specVersion, metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/bom.json");
        const tools = metadata?.tools;

        expect(specVersion).toEqual("1.4");
        assertLegacyToolsList(tools);
        expect(tools).toContainEqual(expect.objectContaining({ name: "rolldown", version: expect.any(String) }));
    });

    test("it should emit metadata.tools as legacy list in XML", async () => {
        const { bom } = await helpers.getCompiledFileXMLContent("plugin-outdir/bom.xml");

        expect(bom.metadata?.tools).toHaveProperty("tool");
        expect(bom.metadata?.tools).not.toHaveProperty("components");
    });
});
