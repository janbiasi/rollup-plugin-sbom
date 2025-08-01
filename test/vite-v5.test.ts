import { describe, expect, test } from "vitest";
import { createOutputTestHelpers } from "./test-helpers";

const helpers = createOutputTestHelpers("vite-v5");

test("it should generate the SBOM files with configured settings", async () => {
    expect(await helpers.getCompiledFileExists(".well-known/sbom")).toBeTruthy();
    expect(await helpers.getCompiledFileExists("plugin-outdir/filename.json")).toBeTruthy();
    expect(await helpers.getCompiledFileExists("plugin-outdir/filename.xml")).toBeTruthy();
});

test("it should generate the JSON SBOM which matches the JSON schema spec version 1.5", async () => {
    const bom = await helpers.getCompiledFileRawContent("plugin-outdir/filename.json");
    expect(helpers.isBomValidAccordingToSchema("v1.6", bom)).toBeTruthy();
});

describe.concurrent("Vite V5", () => {
    test("it should generate a valid urn serial", async () => {
        const bom = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expect(typeof bom.serialNumber).toEqual("string");
        expect(bom.serialNumber.length).toBeGreaterThan(0);
        expect(bom.serialNumber.indexOf("urn:")).toEqual(0);
    });

    test("it should generate correct metadata", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expect(metadata.timestamp).toBeDefined();
        expect(metadata.lifecycles).toContainEqual({ phase: "build" });
        expect(metadata.tools).toContainEqual({
            name: "vite",
            version: expect.any(String),
            externalReferences: expect.any(Array),
        });
    });

    test("it should autodetect the root application correctly", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expect(metadata.component).toBeDefined();
        expect(metadata.component.type).toEqual("application");
        expect(metadata.component.name).toEqual("vite-v5");
        expect(metadata.component.group).toEqual("@fixtures");
    });

    test("it should detect production dependencies correctly", async () => {
        const { components } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        const dependencyNames = components.map((component) => component.name);

        expect(dependencyNames).toContain("react");
        expect(dependencyNames).toContain("react-dom");
    });

    // test case to prevent occured issue:
    // https://github.com/janbiasi/rollup-plugin-sbom/issues/10
    test("it should register dependencies only once (issue #10)", async () => {
        const { components } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        const dependencyNames = components.map((component) => component.name);
        const uniqueDependencyNames = dependencyNames.filter((name, index) => dependencyNames.indexOf(name) === index);

        expect(dependencyNames).toEqual(uniqueDependencyNames);
    });

    test("it should set the supplier correctly when configured", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expect(metadata.supplier).toEqual({
            name: "Supplier Example Inc",
            url: ["https://example.com"],
            contact: [
                {
                    name: "Contact Name",
                    email: "example@example.com",
                    phone: "111-222-4444",
                },
            ],
        });
    });

    test("it should support setting custom properties", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expect(metadata.properties).toEqual([
            {
                name: "unique-key",
                value: "unique-value",
            },
            {
                name: "duplicate-key",
                value: "duplicate-value-1",
            },
            {
                name: "duplicate-key",
                value: "duplicate-value-2",
            },
        ]);
    });
});
