import { lstat, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { XMLParser } from "fast-xml-parser";
import type { Serialize } from "@cyclonedx/cyclonedx-library";
import type { Plugin } from "rollup";

import rollupPluginSbom from "../src/index";
import { PLUGIN_ID } from "../src/helpers";
import type { RollupPluginSbomOptions } from "../src/options";

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

/**
 * Returns the name of a component including its group (e.g. `@aws-sdk/client-s3`)
 */
export function getComponentName({ group, name }: { group?: string; name: string }): string {
    return group ? `${group}/${name}` : name;
}

/**
 * Returns the components the component with the given name (see {@link getComponentName}) depends on
 */
export function getDependsOn(bom: NormalizedBom, componentName: string): NormalizedComponent[] {
    const component = bom.components?.find((c) => getComponentName(c) === componentName);
    const dependency = bom.dependencies?.find((d) => d.ref === component?.["bom-ref"]);
    return (dependency?.dependsOn ?? []).map((ref) => {
        const dependsOn = bom.components?.find((c) => c["bom-ref"] === ref);
        if (!dependsOn) {
            throw new ReferenceError(`Dependency ref "${ref}" of "${componentName}" has no matching component`);
        }
        return dependsOn;
    });
}

export interface BundlerBuildResult {
    /**
     * Warnings emitted by the plugin during the build
     */
    warnings: string[];
    bom: NormalizedBom;
}

/**
 * Output options supported by all bundlers
 */
export interface BundlerOutputOptions {
    preserveModules?: boolean;
    chunkFileNames?: string;
}

export type BundlerBuild = (output?: BundlerOutputOptions) => Promise<BundlerBuildResult>;

// plugins only installed in the fixture, typed loosely as they are not resolvable from the root
type RollupPluginModule = { default: (options?: Record<string, unknown>) => Plugin };

interface OutputLike {
    output: Array<{ type: string; fileName: string; source?: string | Uint8Array }>;
}

/**
 * Creates in-memory builds of a fixture with rollup, rolldown and vite, using the plugin from source.
 * The rollup build requires `@rollup/plugin-node-resolve` and `@rollup/plugin-json` to be installed in the fixture.
 */
export function createBundlerTestHelpers(
    fixtureName: string,
    { input = "index.js", pluginOptions }: { input?: string; pluginOptions?: RollupPluginSbomOptions } = {},
): Record<"rollup" | "rolldown" | "vite", BundlerBuild> {
    const rootDir = resolve(__dirname, "fixtures", fixtureName);
    const inputPath = resolve(rootDir, input);
    const sbomFileName = `${pluginOptions?.outDir ?? "cyclonedx"}/${pluginOptions?.outFilename ?? "bom"}.json`;

    function extractBom(outputs: OutputLike | OutputLike[]): NormalizedBom {
        const asset = [outputs]
            .flat()
            .flatMap(({ output }) => output)
            .find((entry) => entry.type === "asset" && entry.fileName === sbomFileName);
        if (!asset?.source) {
            throw new ReferenceError(`SBOM asset ${sbomFileName} was not emitted`);
        }
        return JSON.parse(typeof asset.source === "string" ? asset.source : new TextDecoder().decode(asset.source));
    }

    async function importFromFixture<T>(specifier: string): Promise<T> {
        const fixtureRequire = createRequire(resolve(rootDir, "package.json"));
        return import(pathToFileURL(fixtureRequire.resolve(specifier)).href);
    }

    // rollup and rolldown report the plugin on the log, vite only passes the prefixed message to its logger
    function createWarningCollector() {
        const warnings: string[] = [];
        return {
            warnings,
            onLog(level: string, log: { plugin?: string; message: string }) {
                if (level === "warn" && log.plugin === PLUGIN_ID) {
                    warnings.push(log.message);
                }
            },
        };
    }

    return {
        async rollup(output) {
            const { rollup } = await import("rollup");
            const { default: nodeResolve } = await importFromFixture<RollupPluginModule>("@rollup/plugin-node-resolve");
            const { default: json } = await importFromFixture<RollupPluginModule>("@rollup/plugin-json");

            const { warnings, onLog } = createWarningCollector();
            const bundle = await rollup({
                input: inputPath,
                plugins: [nodeResolve({ browser: true }), json(), rollupPluginSbom(pluginOptions)],
                onLog,
            });
            const result = await bundle.generate({ format: "esm", ...output });
            await bundle.close();
            return { warnings, bom: extractBom(result) };
        },
        async rolldown(output) {
            const { rolldown } = await import("rolldown");

            const { warnings, onLog } = createWarningCollector();
            const bundle = await rolldown({
                input: inputPath,
                cwd: rootDir,
                platform: "browser",
                plugins: [rollupPluginSbom(pluginOptions)],
                onLog,
            });
            const result = await bundle.generate({ format: "esm", ...output });
            await bundle.close();
            return { warnings, bom: extractBom(result) };
        },
        async vite(output) {
            const { build, createLogger } = await import("vite");

            const warnings: string[] = [];
            const logger = createLogger("silent");
            logger.warn = (message) => {
                if (message.includes(PLUGIN_ID)) {
                    warnings.push(message);
                }
            };
            const result = await build({
                root: rootDir,
                configFile: false,
                customLogger: logger,
                plugins: [rollupPluginSbom(pluginOptions)],
                build: {
                    write: false,
                    minify: false,
                    rolldownOptions: {
                        input: inputPath,
                        output,
                    },
                },
            });
            return { warnings, bom: extractBom(result as OutputLike | OutputLike[]) };
        },
    };
}
