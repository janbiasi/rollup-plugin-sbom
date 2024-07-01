import { join } from "node:path";

import createDebug from "debug";
import type { Plugin } from "rollup";
import * as CDX from "@cyclonedx/cyclonedx-library";

import {
    getPackageJson,
    getCorrespondingPackageFromModuleId,
    convertOrganizationalEntityOptionToModel,
    PLUGIN_ID,
    ResolvedModuleInfo,
    isResolvedIdBundled,
    markLicensesAsDeclared,
} from "./helpers";
import { registerPackageUrlOnComponent, registerTools } from "./builder";
import { DEFAULT_OPTIONS, RollupPluginSbomOptions } from "./options";

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

    let rootComponent: CDX.Models.Component | undefined = undefined;

    /**
     * Registered module components inside the BOM, used to add dependencies for
     * subsequent imports with different specifiers for the same module.
     * The key of each component follows the format `<name>@<version>`
     */
    const registeredModuleComponents = new Map<string, CDX.Models.Component>();

    // Debug loggers
    const debugAutoresolver = createDebug(`${PLUGIN_ID}:autoresolver`);
    const debugWriter = createDebug(`${PLUGIN_ID}:writer`);
    const debugBuilder = createDebug(`${PLUGIN_ID}:builder`);

    return {
        name: PLUGIN_ID,
        async buildStart() {
            // autoregister root entry when starting the build
            if (options.autodetect) {
                try {
                    debugAutoresolver(`Autodetection enabled, trying to resolve root component at ${process.cwd()}`);
                    const rootPkg = await getPackageJson(process.cwd());
                    if (rootPkg) {
                        rootComponent = cdxComponentBuilder.makeComponent(rootPkg, options.rootComponentType);
                        rootComponent.version = rootPkg.version;
                        registerPackageUrlOnComponent(rootComponent, cdxPurlFactory);
                        bom.metadata.component = rootComponent;
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
            // filter out modules that exists in node_modules and
            // also are not Rollup virtual modules (starting with \0)
            const resolutions = [
                ...moduleInfo.importedIdResolutions,
                ...moduleInfo.dynamicallyImportedIdResolutions,
            ].filter(isResolvedIdBundled);

            const potentialComponents = await Promise.all(
                resolutions.map(async (resolution): Promise<ResolvedModuleInfo | null> => {
                    const dependencyModuleInfo = this.getModuleInfo(resolution.id);
                    const pkg = await getCorrespondingPackageFromModuleId(resolution.id);

                    return {
                        pkg,
                        resolution,
                        moduleId: resolution.id,
                        dependencies: await Promise.all(
                            [
                                ...dependencyModuleInfo.importedIdResolutions,
                                ...dependencyModuleInfo.dynamicallyImportedIdResolutions,
                            ]
                                .filter(isResolvedIdBundled)
                                .map((dependencyResolution) =>
                                    getCorrespondingPackageFromModuleId(dependencyResolution.id),
                                ),
                        ),
                    };
                }),
            );

            for (const potentialComponent of potentialComponents) {
                if (!potentialComponent || !potentialComponent.pkg) {
                    // no package resolved, unable to proceeed
                    continue;
                }

                /** package identifier used in {@link registeredModuleComponents} */
                const pkgId = `${potentialComponent.pkg.name}@${potentialComponent.pkg.version}`;

                // add package URL in factory and component
                debugBuilder(`Detected component ${pkgId}`);
                const bomComponent = cdxComponentBuilder.makeComponent(
                    potentialComponent.pkg,
                    CDX.Enums.ComponentType.Library,
                );
                markLicensesAsDeclared(bomComponent);
                registerPackageUrlOnComponent(bomComponent, cdxPurlFactory);

                if (bom.metadata.component) {
                    // register direct dependency on root
                    bom.metadata.component.dependencies.add(bomComponent);
                }

                if (bomComponent && !registeredModuleComponents.has(pkgId)) {
                    debugBuilder(`Registering component ${pkgId} in BOM`);
                    bom.components.add(bomComponent);
                    registeredModuleComponents.set(pkgId, bomComponent);
                } else {
                    debugBuilder(`Component ${pkgId} already registered in BOM`);
                }

                const registeredBomComponent = registeredModuleComponents.get(pkgId);
                potentialComponent.dependencies
                    .filter((depPkg) => depPkg.name !== potentialComponent.pkg.name) // do not register self-contained imports
                    .forEach((depPkg) => {
                        debugBuilder(`Registering dependency ${depPkg.name} on ${potentialComponent.pkg.name}`);
                        const dependencyComponent = cdxComponentBuilder.makeComponent(
                            depPkg,
                            CDX.Enums.ComponentType.Library,
                        );
                        registerPackageUrlOnComponent(dependencyComponent, cdxPurlFactory);
                        markLicensesAsDeclared(dependencyComponent);
                        registeredBomComponent.dependencies.add(dependencyComponent);
                    });
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
                const sbomFilePath = join(options.outDir, `${options.outFilename}.${format}`);
                debugWriter(`Emitting SBOM asset to ${sbomFilePath}`);
                this.emitFile({
                    type: "asset",
                    fileName: sbomFilePath,
                    needsCodeReference: false,
                    source: formatMap[format].serialize(bom, {
                        sortLists: false,
                        space: "\t",
                    }),
                });
            });

            // emit the .well-known/sbom file
            if (options.includeWellKnown) {
                debugWriter(`Emitting well-known file to .well-known/sbom`);
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
