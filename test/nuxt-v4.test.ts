import { describe, expect, test } from "vitest";
import { createOutputTestHelpers } from "./test-helpers";
import path from "node:path";

const helpers = createOutputTestHelpers(
    "nuxt-v4",
    // next compiles to their own directory, containing a client and server folder
    ["node_modules", ".cache", "nuxt", ".nuxt", "dist"].join(path.sep),
);

test("it should generate the SBOM files for the client", async () => {
    expect(await helpers.getCompiledFileExists("client/.well-known/sbom")).toBeTruthy();
    expect(await helpers.getCompiledFileExists("client/plugin-outdir/filename.json")).toBeTruthy();
    expect(await helpers.getCompiledFileExists("client/plugin-outdir/filename.xml")).toBeTruthy();
});

test("it should generate the SBOM files for the server", async () => {
    expect(await helpers.getCompiledFileExists("server/.well-known/sbom")).toBeTruthy();
    expect(await helpers.getCompiledFileExists("server/plugin-outdir/filename.json")).toBeTruthy();
    expect(await helpers.getCompiledFileExists("server/plugin-outdir/filename.xml")).toBeTruthy();
});

test("it should generate the JSON SBOM which matches the JSON schema spec version 1.6", async () => {
    const serverBom = await helpers.getCompiledFileRawContent("server/plugin-outdir/filename.json");
    expect(helpers.isBomValidAccordingToSchema("v1.6", serverBom)).toBeTruthy();
    const clientBom = await helpers.getCompiledFileRawContent("client/plugin-outdir/filename.json");
    expect(helpers.isBomValidAccordingToSchema("v1.6", clientBom)).toBeTruthy();
});

describe.concurrent.each([
    {
        scope: "server",
        expectedDependencies: [
            "shared",
            "reactivity",
            "runtime-core",
            "runtime-dom",
            "destr",
            "ufo",
            "ofetch",
            "hookable",
            "unctx",
            "nuxt",
            "vue",
            "defu",
            "h3",
            "cookie-es",
            "radix3",
            "uncrypto",
            "iron-webcrypto",
            "node-mock-http",
            "errx",
            "devalue",
            "unhead",
        ],
    },
    {
        scope: "client",
        expectedDependencies: [
            "shared",
            "reactivity",
            "runtime-core",
            "runtime-dom",
            "destr",
            "ufo",
            "ofetch",
            "unctx",
            "nuxt",
            "defu",
            "h3",
            "cookie-es",
            "radix3",
            "uncrypto",
            "iron-webcrypto",
            "node-mock-http",
            "errx",
            "devalue",
            "unhead",
        ],
    },
])("Nuxt V4 - $scope", ({ scope, expectedDependencies }) => {
    test("it should generate a valid urn serial", async () => {
        const bom = await helpers.getCompiledFileJSONContent(`${scope}/plugin-outdir/filename.json`);

        expect(typeof bom.serialNumber).toEqual("string");
        expect(bom.serialNumber.length).toBeGreaterThan(0);
        expect(bom.serialNumber.indexOf("urn:")).toEqual(0);
    });

    test("it should generate correct metadata", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent(`${scope}/plugin-outdir/filename.json`);

        expect(metadata.timestamp).toBeDefined();
        expect(metadata.lifecycles).toContainEqual({ phase: "build" });
        expect(metadata.tools).toContainEqual({
            name: "vite",
            version: expect.any(String),
            externalReferences: expect.any(Array),
        });
    });

    test("it should autodetect the root application correctly", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent(`${scope}/plugin-outdir/filename.json`);

        expect(metadata.component).toBeDefined();
        expect(metadata.component.type).toEqual("application");
        expect(metadata.component.name).toEqual("nuxt-v4");
    });

    test("it should detect production dependencies correctly", async () => {
        const { components } = await helpers.getCompiledFileJSONContent(`${scope}/plugin-outdir/filename.json`);
        const dependencyNames = components.map((component) => component.name);

        for (const expectedDependency of expectedDependencies) {
            expect(dependencyNames).toContain(expectedDependency);
        }
    });

    // test case to prevent occured issue:
    // https://github.com/janbiasi/rollup-plugin-sbom/issues/10
    test("it should register dependencies only once (issue #10)", async () => {
        const { components } = await helpers.getCompiledFileJSONContent(`${scope}/plugin-outdir/filename.json`);
        const dependencyIdentifiers = components.map((component) => `${component.name}@${component.version}`);
        const uniqueDependencyIdentifiers = dependencyIdentifiers.filter(
            (name, index) => dependencyIdentifiers.indexOf(name) === index,
        );

        expect(dependencyIdentifiers).toEqual(uniqueDependencyIdentifiers);
    });

    test("it should set the supplier correctly when configured", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent(`${scope}/plugin-outdir/filename.json`);

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
        const { metadata } = await helpers.getCompiledFileJSONContent(`${scope}/plugin-outdir/filename.json`);

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
