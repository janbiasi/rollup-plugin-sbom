import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import type { Plugin } from "rollup";
import type { Serialize } from "@cyclonedx/cyclonedx-library";

import rollupPluginSbom from "../src/index";
import { PLUGIN_ID } from "../src/helpers";

type NormalizedBom = Serialize.JSON.Types.Normalized.Bom;

// plugins only installed in the fixture, typed loosely as they are not resolvable from the root
type RollupPluginModule = { default: (options?: Record<string, unknown>) => Plugin };

interface Scenario {
    preserveModules?: boolean;
    chunkFileNames?: string;
}

interface BuildResult {
    warnings: string[];
    bom: NormalizedBom;
}

const fixtureDir = resolve(__dirname, "fixtures", "regression-251");
const input = resolve(fixtureDir, "index.js");
const sbomFileName = "cyclonedx/bom.json";
const sbomOptions = { autodetect: false, includeWellKnown: false };

interface OutputLike {
    output: Array<{ type: string; fileName: string; source?: string | Uint8Array }>;
}

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
    const fixtureRequire = createRequire(resolve(fixtureDir, "package.json"));
    return import(pathToFileURL(fixtureRequire.resolve(specifier)).href);
}

const bundlers: Record<string, (scenario: Scenario) => Promise<BuildResult>> = {
    async rollup(output) {
        const { rollup } = await import("rollup");
        const { default: nodeResolve } = await importFromFixture<RollupPluginModule>("@rollup/plugin-node-resolve");
        const { default: json } = await importFromFixture<RollupPluginModule>("@rollup/plugin-json");

        const warnings: string[] = [];
        const bundle = await rollup({
            input,
            plugins: [nodeResolve({ browser: true }), json(), rollupPluginSbom(sbomOptions)],
            onLog(level, log) {
                if (level === "warn" && log.plugin === PLUGIN_ID) {
                    warnings.push(log.message);
                }
            },
        });
        const result = await bundle.generate({ format: "esm", ...output });
        await bundle.close();
        return { warnings, bom: extractBom(result) };
    },
    async rolldown(output) {
        const { rolldown } = await import("rolldown");

        const warnings: string[] = [];
        const bundle = await rolldown({
            input,
            cwd: fixtureDir,
            platform: "browser",
            plugins: [rollupPluginSbom(sbomOptions)],
            onLog(level, log) {
                if (level === "warn" && log.plugin === PLUGIN_ID) {
                    warnings.push(log.message);
                }
            },
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
            root: fixtureDir,
            configFile: false,
            customLogger: logger,
            plugins: [rollupPluginSbom(sbomOptions)],
            build: {
                write: false,
                minify: false,
                rolldownOptions: {
                    input,
                    output,
                },
            },
        });
        return { warnings, bom: extractBom(result as OutputLike | OutputLike[]) };
    },
};

function getComponentId({ group, name }: { group?: string; name: string }) {
    return group ? `${group}/${name}` : name;
}

function getDependsOn(bom: NormalizedBom, componentId: string) {
    const component = bom.components?.find((c) => getComponentId(c) === componentId);
    const dependency = bom.dependencies?.find((d) => d.ref === component?.["bom-ref"]);
    return (dependency?.dependsOn ?? []).map(
        (ref) => bom.components?.find((c) => c["bom-ref"] === ref) ?? { name: ref },
    );
}

const scenarios: Record<string, Scenario> = {
    preserveModules: { preserveModules: true },
    "single output": { preserveModules: false },
    // chunk file names may contain "node_modules" without preserveModules too
    "chunkFileNames within node_modules": { chunkFileNames: "node_modules/[name]-[hash].js" },
};

// https://github.com/janbiasi/rollup-plugin-sbom/issues/251
describe.each(Object.keys(bundlers))(
    "Regression #251 — chunk imports are not module ids (%s)",
    (bundler) => {
        describe.each(Object.keys(scenarios))("%s", (scenario) => {
            let result: Promise<BuildResult> | undefined;
            const getResult = () => (result ??= bundlers[bundler]!(scenarios[scenario]!));

            test("it should not warn about missing dependency info or package data", async () => {
                const { warnings } = await getResult();
                expect(warnings.filter((w) => /Missing (dependency info|package data)/.test(w))).toEqual([]);
            });

            test("it should register the packages of the imported modules", async () => {
                const { bom } = await getResult();
                const componentIds = bom.components?.map(getComponentId);
                expect(componentIds).toContain("@aws-sdk/client-s3");
                expect(componentIds).toContain("@smithy/core");
            });

            test("it should keep the dependency graph between packages", async () => {
                const { bom } = await getResult();
                expect(getDependsOn(bom, "@aws-sdk/client-s3").map(getComponentId)).toContain("@smithy/core");
            });
        });
    },
    120_000,
);
