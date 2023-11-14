import { join } from "node:path";

import type { Plugin } from "rollup";
import * as CDX from "@cyclonedx/cyclonedx-library";

import { type Package } from "normalize-package-data";

import { getPackageJson, getCorrespondingPackageFromModuleId } from "./helpers";
import { registerPackageUrlOnComponent, registerTools } from "./builder";
import { DEFAULT_OPTIONS, RollupPluginSbomOptions } from "./options";

/**
 * Plugin identifier for {@link rollupPluginSbom}
 */
const PLUGIN_ID = "rollup-plugin-sbom";

/**
 * Plugin to generate CycloneDX SBOMs for your application or library
 * Compatible with Rollup and Vite.
 */
export default function rollupPluginSbom(userOptions?: RollupPluginSbomOptions): Plugin {
    const options = {
        ...DEFAULT_OPTIONS,
        ...userOptions,
    };

    const cdxExternalReferenceFactory = new CDX.Factories.FromNodePackageJson.ExternalReferenceFactory();
    const cdxLicenseFactory = new CDX.Factories.LicenseFactory();
    const cdxPurlFactory = new CDX.Factories.FromNodePackageJson.PackageUrlFactory("npm");
    const cdxToolBuilder = new CDX.Builders.FromNodePackageJson.ToolBuilder(cdxExternalReferenceFactory);
    const cdxComponentBuilder = new CDX.Builders.FromNodePackageJson.ComponentBuilder(
        cdxExternalReferenceFactory,
        cdxLicenseFactory,
    );

    const jsonSerializer = new CDX.Serialize.JsonSerializer(
        new CDX.Serialize.JSON.Normalize.Factory(CDX.Spec.SpecVersionDict[options.specVersion]!),
    );
    const xmlSerializer = new CDX.Serialize.XmlSerializer(
        new CDX.Serialize.XML.Normalize.Factory(CDX.Spec.SpecVersionDict[options.specVersion]!),
    );

    const bom = new CDX.Models.Bom();

    return {
        name: PLUGIN_ID,
        async buildStart() {
            // autoregister root entry when starting the build
            if (options.autodetect) {
                try {
                    const rootPkg = await getPackageJson(process.cwd());
                    if (rootPkg) {
                        bom.metadata.component = cdxComponentBuilder.makeComponent(rootPkg, options.rootComponentType);
                        bom.metadata.component.version = rootPkg.version;
                        registerPackageUrlOnComponent(bom.metadata.component, cdxPurlFactory);
                    }
                } catch (err) {
                    this.error("could not autodetect package.json in the current working directory");
                }
            }

            // add lifecycle if we build
            bom.metadata.lifecycles.add(CDX.Enums.LifecyclePhase.Build);

            if (options.saveTimestamp) {
                bom.metadata.timestamp = new Date();
            }

            if (options.generateSerial) {
                bom.serialNumber = CDX.Utils.BomUtility.randomSerialNumber();
            }

            // register known tools in the chain
            await registerTools(bom, cdxToolBuilder);
        },
        /**
         * Register only the effectively imported third party modules from `node_modules`
         */
        async moduleParsed(moduleInfo) {
            const nodeModuleImportedIds = moduleInfo.importedIds.filter((entry) => entry.includes("node_modules"));
            const potentialComponents = await Promise.all(
                nodeModuleImportedIds.map(getCorrespondingPackageFromModuleId),
            );

            // iterate over all imported modules and add them to the BOM
            const pkgs = potentialComponents.filter((entry): entry is Package => !!entry);
            for (const pkg of pkgs) {
                const component = cdxComponentBuilder.makeComponent(pkg, CDX.Enums.ComponentType.Library);
                // add package URL in factory and component
                registerPackageUrlOnComponent(component, cdxPurlFactory);
                component && bom.components.add(component);
            }
        },
        /**
         * Finalize the SBOM and emit files
         */
        generateBundle() {
            this.emitFile({
                type: "asset",
                fileName: join(options.outDir, "bom.json"),
                needsCodeReference: false,
                source: jsonSerializer.serialize(bom, {
                    sortLists: false,
                    space: "\t",
                }),
            });

            this.emitFile({
                type: "asset",
                fileName: join(options.outDir, ".well-known/sbom"),
                needsCodeReference: false,
                source: jsonSerializer.serialize(bom, {
                    sortLists: false,
                    space: "\t",
                }),
            });

            this.emitFile({
                type: "asset",
                fileName: join(options.outDir, "bom.xml"),
                needsCodeReference: false,
                source: xmlSerializer.serialize(bom, {
                    sortLists: false,
                    space: "\t",
                }),
            });
        },
    } satisfies Plugin;
}
