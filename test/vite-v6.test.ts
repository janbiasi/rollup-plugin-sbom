import { describe, expect, test } from "vitest";
import { createOutputTestHelpers } from "./test-helpers";

const helpers = createOutputTestHelpers("vite-v6");

describe.concurrent("Vite V6", () => {
    test("it should generate the SBOM files with configured settings", async () => {
        expect(await helpers.getCompiledFileExists(".well-known/sbom")).toBeTruthy();
        expect(await helpers.getCompiledFileExists("plugin-outdir/filename.json")).toBeTruthy();
        expect(await helpers.getCompiledFileExists("plugin-outdir/filename.xml")).toBeTruthy();
    });

    test("it should generate the JSON SBOM which matches the JSON schema spec version 1.5", async () => {
        const bom = await helpers.getCompiledFileRawContent("plugin-outdir/filename.json");
        expect(helpers.isBomValidAccordingToSchema("v1.6", bom)).toBeTruthy();
    });

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
        expect(metadata.component.name).toEqual("vite-v6");
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

    test("it should generate correct dependency references (i.E. React DOM)", async () => {
        const { dependencies } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
        const reactDomDependency = dependencies.find((d) => d.ref.startsWith("pkg:npm/react-dom"));

        expect(reactDomDependency.dependsOn).toBeDefined();
        expect(reactDomDependency.dependsOn).toContain(
            "pkg:npm/react@19.1.1?vcs_url=git%2Bhttps%3A%2F%2Fgithub.com%2Ffacebook%2Freact.git#packages/react",
        );
    });

    // https://github.com/janbiasi/rollup-plugin-sbom/issues/86
    describe("dependency references on the root component (issue #86)", async () => {
        test.each([
            "pkg:npm/react",
            "pkg:npm/react-dom",
            "pkg:npm/%40mui/base",
            "pkg:npm/date-fns",
            "pkg:npm/luxon",
            "pkg:npm/react-remove-scroll",
        ])("it should include '%s'", async (purlDepRef) => {
            const { dependencies } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");
            const fixtureComponent = dependencies.find((d) => d.ref.startsWith("pkg:npm/%40fixtures/vite-v6"));

            expect(fixtureComponent.dependsOn).toBeDefined();

            const fixtureDepsWithoutVersionAndVcs = fixtureComponent.dependsOn.map((purl) => purl.split("@")[0]);
            expect(fixtureDepsWithoutVersionAndVcs).toContain(purlDepRef);
        });
    });
});
