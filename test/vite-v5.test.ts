import { describe, expect, expectTypeOf, test } from "vitest";
import { createOutputTestHelpers } from "./helpers";

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

test("it should generate the well-known file correctly", async () => {
    const bom = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
    const wellKnownBom = await helpers.getCompiledFileJSONContent(".well-known/sbom");

    expect(bom).toStrictEqual(wellKnownBom);
});

describe.concurrent("Metadata", () => {
    test("it should generate a valid urn serial", async () => {
        const bom = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expectTypeOf(bom.serialNumber).toMatchTypeOf<string>("");
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

    test("it should autodetect the root application component correctly", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expect(metadata.component).toBeDefined();
        expect(metadata.component.type).toEqual("application");
        expect(metadata.component.name).toEqual("vite-v5");
        expect(metadata.component.group).toEqual("@fixtures");
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

    test("it should set the supplier correctly when configured (issue #12)", async () => {
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
});

describe("Components", () => {
    test("it should detect production dependencies as components correctly", async () => {
        const { components } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        const componentNames = components.map((component) =>
            // recompute full NPM name if applicable
            component.group ? `${component.group}/${component.name}` : component.name,
        );

        // direct dependencides
        expect(componentNames).toContain("react");
        expect(componentNames).toContain("react-dom");
        expect(componentNames).toContain("@mui/base");
        expect(componentNames).toContain("date-fns");
        // transitive dependencies
        expect(componentNames).toContain("@mui/utils");
        expect(componentNames).toContain("prop-types");
        expect(componentNames).toContain("clsx");
        expect(componentNames).toContain("react-is");
        // injected runtime dependencies
        expect(componentNames).toContain("@babel/runtime");
        expect(componentNames).toContain("scheduler");
    });

    // test case to prevent occured issue:
    // https://github.com/janbiasi/rollup-plugin-sbom/issues/10
    test("it should register components only once (issue #10)", async () => {
        const { components } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        const dependencyNames = components.map((component) => component.name);
        const uniqueDependencyNames = dependencyNames.filter((name, index) => dependencyNames.indexOf(name) === index);

        expect(dependencyNames).toEqual(uniqueDependencyNames);
    });
});

describe("Dependencies", () => {
    test("it should not list dependencies multiple times (#10)", async () => {
        const { dependencies } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        const dependencyBomRefs = dependencies.map((entry) => entry.ref);

        for (const [index, ref] of dependencyBomRefs.entries()) {
            expect(dependencyBomRefs.indexOf(ref)).toEqual(index);
        }
    });

    test("it should add the reigstered components as dependencies correctly (issue #86)", async () => {
        const { components, dependencies } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        const dependencyBomRefs = dependencies.map((entry) => entry.ref);

        for (const component of components) {
            expect(dependencyBomRefs).toContain(component["bom-ref"]);
        }
    });
});
