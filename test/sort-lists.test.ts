/**
 * Important: Please take a look at the test fixture documentation before altering tests.
 */

import { describe, expect, test } from "vitest";
import { createOutputTestHelpers, getToolComponents } from "./test-helpers";

const helpers = createOutputTestHelpers("sort-lists");

// mirrors the comparison of the CycloneDX library
const byLocale = (a: string, b: string) => a.localeCompare(b);

describe.concurrent("Sort Lists", () => {
    test("it should sort components by bom-ref", async () => {
        const { components } = await helpers.getCompiledFileJSONContent("plugin-outdir/bom.json");
        const refs = components?.map((c) => c["bom-ref"] ?? "") ?? [];

        expect(refs.length).toBeGreaterThan(1);
        expect(refs).toEqual([...refs].sort(byLocale));
    });

    // tools have no bom-ref, so they are sorted by group, name and version
    test("it should sort tools", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/bom.json");
        const names = getToolComponents(metadata?.tools).map((t) => t.name);

        expect(names.length).toBeGreaterThan(0);
        expect(names).toEqual([...names].sort(byLocale));
    });

    test("it should sort dependencies", async () => {
        const { dependencies } = await helpers.getCompiledFileJSONContent("plugin-outdir/bom.json");
        const refs = dependencies?.map((d) => d.ref) ?? [];

        expect(refs.length).toBeGreaterThan(1);
        expect(refs).toEqual([...refs].sort(byLocale));
    });

    test("it should sort properties by name and value", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/bom.json");

        expect(metadata?.properties).toEqual([
            { name: "a-key", value: "a-value-1" },
            { name: "a-key", value: "a-value-2" },
            { name: "z-key", value: "z-value" },
        ]);
    });

    test("it should produce identical JSON and well-known output", async () => {
        const bom = await helpers.getCompiledFileRawContent("plugin-outdir/bom.json");
        const wellKnown = await helpers.getCompiledFileRawContent(".well-known/sbom");

        expect(wellKnown).toEqual(bom);
    });
});
