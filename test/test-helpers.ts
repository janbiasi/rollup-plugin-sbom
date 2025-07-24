import { lstat, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { XMLParser } from "fast-xml-parser";

function readJsonFile(path: string) {
    return JSON.parse(readFileSync(resolve(path), "utf-8"));
}

const bomSchemaVersions = {
    "v1.5": readJsonFile("./test/schemas/bom-1.5.schema.json"),
    "v1.6": readJsonFile("./test/schemas/bom-1.6.schema.json"),
};

const ajv = new Ajv({
    validateSchema: true,
    validateFormats: true,
    strict: false,
});

ajv.addSchema(readJsonFile("./test/schemas/spdx.schema.json"));
ajv.addSchema(readJsonFile("./test/schemas/cyclonedx-spdx.schema.json"));
ajv.addSchema(readJsonFile("./test/schemas/jsf.schema.json"));

addFormats(ajv);

// TODO: Find correct formats for iri reference and idn email
ajv.addFormat("iri-reference", /.*?/gi);
ajv.addFormat("idn-email", /.*?/gi);

export function createOutputTestHelpers(fixtureName: string) {
    const rootDir = resolve(__dirname, "fixtures", fixtureName);

    const methods = {
        async getCompiledFileExists(filePath: string) {
            const result = await lstat(resolve(rootDir, "dist", filePath));
            return result.isFile();
        },
        getCompiledFileRawContent(filePath: string) {
            return readFile(resolve(rootDir, "dist", filePath), "utf-8");
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async getCompiledFileJSONContent(filePath: string): Promise<Record<string, any>> {
            try {
                return JSON.parse(await methods.getCompiledFileRawContent(filePath));
            } catch {
                throw new ReferenceError(`Could not read file from ${filePath}`);
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async getCompiledFileXMLContent(filePath: string): Promise<Record<string, any>> {
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
