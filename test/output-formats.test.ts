import { describe, expect, test } from "vitest";
import { createOutputTestHelpers } from "./helpers";

const helpers = createOutputTestHelpers("resolution");

describe.concurrent("Output Formats", () => {
    test("it should generate the SBOM files with configured settings (XML, JSON, Well Known)", async () => {
        expect(await helpers.getCompiledFileExists(".well-known/sbom")).toBeTruthy();
        expect(await helpers.getCompiledFileExists("plugin-outdir/filename.json")).toBeTruthy();
        expect(await helpers.getCompiledFileExists("plugin-outdir/filename.xml")).toBeTruthy();
    });

    describe.concurrent("XML", () => {
        test("it should output an XML file correctly", async () => {
            const { bom } = await helpers.getCompiledFileXMLContent("plugin-outdir/filename.xml");
            expect(bom).toBeDefined();
            expect(bom.metadata.component).toBeDefined();
            expect(bom.metadata.component.name).toEqual("resolution");
            expect(bom.metadata.component.group).toEqual("@fixtures");
        });
    });

    describe.concurrent("JSON", () => {
        test("it should autodetect the root application correctly", async () => {
            const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

            expect(metadata.component).toBeDefined();
            expect(metadata.component.type).toEqual("application");
            expect(metadata.component.name).toEqual("resolution");
            expect(metadata.component.group).toEqual("@fixtures");
        });
    });
});
