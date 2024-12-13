import { join } from "node:path";

import type { Plugin } from "rollup";
import * as CDX from "@cyclonedx/cyclonedx-library";

import { type Package } from "normalize-package-data";

import {
    getPackageJson,
    getCorrespondingPackageFromModuleId,
    convertOrganizationalEntityOptionToModel,
} from "./helpers";
import { registerPackageUrlOnComponent, registerTools } from "./builder";
import { DEFAULT_OPTIONS, RollupPluginSbomOptions } from "./options";
import type { ComponentType } from "@cyclonedx/cyclonedx-library/Enums";

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

    const metadata = new CDX.Models.Metadata({
        supplier: options.supplier && convertOrganizationalEntityOptionToModel(options.supplier),
        properties:
            options.properties &&
            new CDX.Models.PropertyRepository(
                options.properties.map(({ name, value }) => new CDX.Models.Property(name, value)),
            ),
    });

    const bom = new CDX.Models.Bom({
        metadata,
    });

    // A list of registered package identifiers (name and version) to prevent duplicates
    const registeredPackageIds: string[] = [];

    return {
        name: PLUGIN_ID,
        async buildStart() {
            // autoregister root entry when starting the build
            if (options.autodetect) {
                try {
                    const rootPkg = await getPackageJson(process.cwd());
                    if (rootPkg) {
                        bom.metadata.component = cdxComponentBuilder.makeComponent(
                            rootPkg,
                            options.rootComponentType as ComponentType,
                        );
                        bom.metadata.component.version = rootPkg.version;
                        registerPackageUrlOnComponent(bom.metadata.component, cdxPurlFactory);
                    }
                } catch {
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
            // filter out modules that exists in node_modules and
            // also are not Rollup virtual modules (starting with \0)
            const nodeModuleImportedIds = moduleInfo.importedIds.filter(
                (entry) => entry.includes("node_modules") && !entry.startsWith("\0"),
            );

            const potentialComponents = await Promise.all(
                nodeModuleImportedIds.map((moduleId) => {
                    if (!moduleId.includes("node_modules")) {
                        return Promise.resolve(null);
                    }
                    return getCorrespondingPackageFromModuleId(moduleId);
                }),
            );

            // iterate over all imported unique modules and add them to the BOM
            const pkgs = potentialComponents.filter((entry): entry is Package => !!entry);

            for (const pkg of pkgs) {
                const pkgId = `${pkg.name}@${pkg.version}`;

                if (registeredPackageIds.includes(pkgId)) {
                    // abort if package is already registered in factory
                    continue;
                }

                // add package URL in factory and component
                const component = cdxComponentBuilder.makeComponent(pkg, CDX.Enums.ComponentType.Library);
                registerPackageUrlOnComponent(component, cdxPurlFactory);

                if (component) {
                    bom.components.add(component);
                }
                registeredPackageIds.push(pkgId);
            }
        },
        /**
         * Finalize the SBOM and emit files
         */
        generateBundle() {
            const formatMap: Record<string, CDX.Serialize.BaseSerializer<unknown>> = {
                json: jsonSerializer,
                xml: xmlSerializer,
            };

            options.outFormats.forEach((format) => {
                if (!formatMap[format]) {
                    throw new Error(`Unsupported format: ${format}`);
                }

                // serialize the BOM and emit the file
                this.emitFile({
                    type: "asset",
                    fileName: join(options.outDir, `${options.outFilename}.${format}`),
                    needsCodeReference: false,
                    source: formatMap[format].serialize(bom, {
                        sortLists: false,
                        space: "\t",
                    }),
                });
            });

            // emit the .well-known/sbom file
            if (options.includeWellKnown) {
                this.emitFile({
                    type: "asset",
                    fileName: ".well-known/sbom",
                    needsCodeReference: false,
                    source: jsonSerializer.serialize(bom, {
                        sortLists: false,
                        space: "\t",
                    }),
                });
            }
        },
    } satisfies Plugin;
}
