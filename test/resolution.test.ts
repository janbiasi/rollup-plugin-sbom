/**
 * Important: Please take a look at the test fixture documentation before altering tests in ./fixtures/nested-vendor-modules/README.md
 * This test also relates to the following issues:
 * @see https://github.com/janbiasi/rollup-plugin-sbom/issues/86
 * @see https://github.com/janbiasi/rollup-plugin-sbom/issues/169
 */

import { describe, expect, test } from "vitest";
import { createOutputTestHelpers } from "./helpers";

const helpers = createOutputTestHelpers("resolution");

describe("Resolution", () => {
    test("it should generate the SBOM files with configured settings", async () => {
        expect(await helpers.getCompiledFileExists(".well-known/sbom")).toBeTruthy();
        expect(await helpers.getCompiledFileExists("plugin-outdir/filename.json")).toBeTruthy();
        expect(await helpers.getCompiledFileExists("plugin-outdir/filename.xml")).toBeTruthy();
    });

    test("it should autodetect the root application correctly", async () => {
        const { metadata } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

        expect(metadata.component).toBeDefined();
        expect(metadata.component.type).toEqual("application");
        expect(metadata.component.name).toEqual("resolution");
        expect(metadata.component.group).toEqual("@fixtures");
    });

    describe.concurrent("Issues", () => {
        // https://github.com/janbiasi/rollup-plugin-sbom/issues/169
        test("it should detect all used components correctly (related to issue #169)", async () => {
            const { components } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

            expect(components).toContainEqual(
                expect.objectContaining({
                    name: "a",
                    version: "1.0.0",
                }),
            );
            expect(components).toContainEqual(
                expect.objectContaining({
                    name: "a",
                    version: "2.0.0",
                }),
            );
            expect(components).toContainEqual(
                expect.objectContaining({
                    name: "b",
                    version: "1.0.0",
                }),
            );
            expect(components).toContainEqual(
                expect.objectContaining({
                    name: "c",
                    version: "1.0.0",
                }),
            );
            expect(components).toContainEqual(
                expect.objectContaining({
                    name: "side-effect",
                    version: "1.0.0",
                }),
            );

            expect(components).not.toContainEqual(
                expect.objectContaining({
                    name: "unused",
                    version: "1.0.0",
                }),
            );
        });

        // https://github.com/janbiasi/rollup-plugin-sbom/issues/169
        test("it should represent depending relation on parent modules correctly (related to issue #86 and #169)", async () => {
            const { dependencies } = await helpers.getCompiledFileJSONContent("plugin-outdir/filename.json");

            const dependencyAv1 = dependencies.find(({ ref }) => ref.endsWith("a@1.0.0"));
            expect(dependencyAv1).toBeDefined();
            expect(dependencyAv1.dependsOn).toBeDefined();
            expect(dependencyAv1.dependsOn).toContain("pkg:npm/c@1.0.0");

            const dependencyAv2 = dependencies.find(({ ref }) => ref.endsWith("a@2.0.0"));
            expect(dependencyAv2).toBeDefined();
            expect(dependencyAv2.dependsOn).not.toBeDefined();

            const dependencyBv1 = dependencies.find(({ ref }) => ref.endsWith("b@1.0.0"));
            expect(dependencyBv1).toBeDefined();
            expect(dependencyBv1.dependsOn).toBeDefined();
            expect(dependencyBv1.dependsOn).toContain("pkg:npm/a@2.0.0");
            expect(dependencyBv1.dependsOn).toContain("pkg:npm/side-effect@1.0.0");

            const dependencyCv1 = dependencies.find(({ ref }) => ref.endsWith("c@1.0.0"));
            expect(dependencyCv1).toBeDefined();
            expect(dependencyCv1.dependsOn).not.toBeDefined();

            const dependencySideEffectv1 = dependencies.find(({ ref }) => ref.endsWith("side-effect@1.0.0"));
            expect(dependencySideEffectv1).toBeDefined();
            expect(dependencySideEffectv1.dependsOn).not.toBeDefined();
        });
    });
});
