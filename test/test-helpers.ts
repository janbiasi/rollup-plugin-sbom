import { lstat, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { XMLParser } from "fast-xml-parser";
import type { Serialize } from "@cyclonedx/cyclonedx-library";

type NormalizedBom = Serialize.JSON.Types.Normalized.Bom;
type NormalizedToolsType = Serialize.JSON.Types.Normalized.ToolsType;
type NormalizedTool = Serialize.JSON.Types.Normalized.Tool;
type NormalizedComponent = Serialize.JSON.Types.Normalized.Component;

/**
 * Returns the tool components from `metadata.tools`, asserting the `{ components, services }`
 * object form which is emitted for CycloneDX 1.5 and later
 */
export function getToolComponents(tools: NormalizedToolsType | undefined): NormalizedComponent[] {
    if (!tools || Array.isArray(tools) || !tools.components) {
        throw new TypeError(`Expected metadata.tools.components to be defined (received ${JSON.stringify(tools)})`);
    }
    return tools.components;
}

/**
 * Asserts that `metadata.tools` uses the deprecated list form which is emitted for CycloneDX 1.4 and earlier
 */
export function assertLegacyToolsList(tools: NormalizedToolsType | undefined): asserts tools is NormalizedTool[] {
    if (!Array.isArray(tools)) {
        throw new TypeError(`Expected metadata.tools to be a list of tools (received ${JSON.stringify(tools)})`);
    }
}

function readJsonFile(path: string) {
    return JSON.parse(readFileSync(resolve(path), "utf-8"));
}

const bomSchemaVersions = {
    "v1.5": readJsonFile("./test/schemas/bom-1.5.schema.json"),
    "v1.6": readJsonFile("./test/schemas/bom-1.6.schema.json"),
    "v1.7": readJsonFile("./test/schemas/bom-1.7.schema.json"),
};

const ajv = new Ajv({
    validateSchema: true,
    validateFormats: true,
    strict: false,
});

ajv.addSchema(readJsonFile("./test/schemas/spdx.schema.json"));
ajv.addSchema(readJsonFile("./test/schemas/cyclonedx-spdx.schema.json"));
ajv.addSchema(readJsonFile("./test/schemas/jsf.schema.json"));
ajv.addSchema(readJsonFile("./test/schemas/cryptography-defs.schema.json"));

addFormats(ajv);

// TODO: Find correct formats for iri reference and idn email
ajv.addFormat("iri-reference", /.*?/gi);
ajv.addFormat("idn-email", /.*?/gi);

export function createOutputTestHelpers(fixtureName: string, outputBasePath = "dist") {
    const rootDir = resolve(__dirname, "fixtures", fixtureName);

    const methods = {
        async getCompiledFileExists(filePath: string) {
            const result = await lstat(resolve(rootDir, outputBasePath, filePath));
            return result.isFile();
        },
        getCompiledFileRawContent(filePath: string) {
            return readFile(resolve(rootDir, outputBasePath, filePath), "utf-8");
        },
        async getCompiledFileJSONContent(filePath: string): Promise<NormalizedBom> {
            try {
                return JSON.parse(await methods.getCompiledFileRawContent(filePath));
            } catch {
                throw new ReferenceError(`Could not read file from ${filePath}`);
            }
        },
        async getCompiledFileXMLContent(filePath: string): Promise<{ bom: NormalizedBom }> {
            try {
                const parser = new XMLParser();
                return parser.parse(await methods.getCompiledFileRawContent(filePath));
            } catch {
                throw new ReferenceError(`Could not read file from ${filePath}`);
            }
        },
        isBomValidAccordingToSchema(version: keyof typeof bomSchemaVersions, rawFileContent: string) {
            ajv.validate(bomSchemaVersions[version], JSON.parse(rawFileContent));

            if (ajv.errors) {
                console.error(ajv.errorsText(ajv.errors));
            }

            return ajv.errors ? ajv.errors.length === 0 : true;
        },
    };

    return methods;
}
