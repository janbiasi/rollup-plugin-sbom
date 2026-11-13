import { describe, expect, test } from "vitest";

import {
    type BundlerBuildResult,
    type BundlerOutputOptions,
    createBundlerTestHelpers,
    getComponentName,
    getDependsOn,
} from "./test-helpers";

const bundlers = createBundlerTestHelpers("regression-251", {
    pluginOptions: { autodetect: false, includeWellKnown: false },
});

const scenarios: Record<string, BundlerOutputOptions> = {
    preserveModules: { preserveModules: true },
    "single output": { preserveModules: false },
    // chunk file names may contain "node_modules" without preserveModules too
    "chunkFileNames within node_modules": { chunkFileNames: "node_modules/[name]-[hash].js" },
};

// https://github.com/janbiasi/rollup-plugin-sbom/issues/251
describe.each(Object.keys(bundlers) as Array<keyof typeof bundlers>)(
    "Regression #251 — chunk imports are not module ids (%s)",
    (bundler) => {
        describe.each(Object.keys(scenarios))("%s", (scenario) => {
            let result: Promise<BundlerBuildResult> | undefined;
            const getResult = () => (result ??= bundlers[bundler](scenarios[scenario]));

            test("it should not warn about missing dependency info or package data", async () => {
                const { warnings } = await getResult();
                expect(warnings.filter((w) => /Missing (dependency info|package data)/.test(w))).toEqual([]);
            });

            test("it should register the packages of the imported modules", async () => {
                const { bom } = await getResult();
                const componentNames = bom.components?.map(getComponentName);
                expect(componentNames).toContain("@aws-sdk/client-s3");
                expect(componentNames).toContain("@smithy/core");
            });

            test("it should keep the dependency graph between packages", async () => {
                const { bom } = await getResult();
                expect(getDependsOn(bom, "@aws-sdk/client-s3").map(getComponentName)).toContain("@smithy/core");
            });
        });
    },
    120_000,
);
