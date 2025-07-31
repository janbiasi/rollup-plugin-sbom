import { join } from "node:path";
import type { Plugin, PluginContext } from "rollup";
import * as CDX from "@cyclonedx/cyclonedx-library";
import type { ComponentType } from "@cyclonedx/cyclonedx-library/Enums";

import { convertOrganizationalEntityOptionToModel, PLUGIN_ID, generatePackageId } from "./helpers";
import { autoRegisterTools } from "./tools";
import { DEFAULT_OPTIONS, type RollupPluginSbomOptions } from "./options";
import { getAllExternalModules } from "./analyzer";
import { type PackageId } from "./types/aliases";
import type { ExternalModuleInfo } from "./analyzer";
import { createDependencyInfoRegistry, aggregateDependencyInfoByModuleId } from "./dependency-info-registry";
import { readPackage, type NormalizedPackageJson } from "./package-reader";

/**
 * Plugin to generate CycloneDX SBOMs for your application or library
 * Compatible with Rollup and Vite.
 */
export default function rollupPluginSbom(userOptions?: RollupPluginSbomOptions): Plugin {
    const options = {
        ...DEFAULT_OPTIONS,
        ...userOptions,
    };

    const dependencyInfoRegistry = createDependencyInfoRegistry();

    const cdxExternalReferenceFactory = new CDX.Factories.FromNodePackageJson.ExternalReferenceFactory();
    const cdxLicenseFactory = new CDX.Factories.LicenseFactory();
    const cdxPurlFactory = new CDX.Factories.FromNodePackageJson.PackageUrlFactory("npm");
    const cdxToolBuilder = new CDX.Builders.FromNodePackageJson.ToolBuilder(cdxExternalReferenceFactory);
    const cdxLicenseEvidenceGatherer = new CDX.Utils.LicenseUtility.LicenseEvidenceGatherer();
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
    let rootPackageJson: NormalizedPackageJson | undefined = undefined;

    /**
     * Registered module components inside the BOM, used to add dependencies for
     * subsequent imports with different specifiers for the same module.
     */
    const registeredModules = new Map<PackageId, CDX.Models.Component>();

    function processExternalModuleForBom(context: PluginContext, mod: ExternalModuleInfo) {
        const depedendencyInfo = dependencyInfoRegistry.get(mod.modulePath);
        if (!depedendencyInfo) {
            context.warn(`Missing dependency info for module ${mod.modulePath} in registry, this should not happen.`);
        }

        const { pkg, licenseEvidence } = depedendencyInfo;
        if (!pkg || !pkg.name || !pkg.version) {
            context.warn(`Missing package data for module ${mod.modulePath} in registry, this should not happen.`);
            return;
        }

        const packageId = generatePackageId(pkg);
        if (registeredModules.has(packageId)) {
            return registeredModules.get(packageId);
        }

        context.debug({
            message: `Registering package ${pkg?.name}@${pkg?.version}`,
            meta: mod,
        });

        const component = cdxComponentBuilder.makeComponent(pkg);
        component.purl = cdxPurlFactory.makeFromComponent(component);
        component.bomRef.value = component.purl?.toString();
        component.licenses.forEach((l) => {
            l.acknowledgement = CDX.Enums.LicenseAcknowledgement.Declared;
        });

        if (options.collectLicenseEvidence) {
            component.evidence = new CDX.Models.ComponentEvidence({
                licenses: new CDX.Models.LicenseRepository(licenseEvidence),
            });

            if (component.evidence?.licenses.size > 0) {
                context.debug({
                    message: `Attaching ${component.evidence.licenses.size} license evidence to ${pkg?.name}@${pkg?.version}`,
                    meta: component.evidence,
                });
            }
        }

        registeredModules.set(packageId, component);
        bom.components.add(component);

        // register direct dependencies on the root component itself
        if (rootPackageJson?.dependencies && pkg.name in rootPackageJson.dependencies) {
            rootComponent.dependencies.add(component.bomRef);
        }

        mod.dependsOn.forEach((externalDependencyModuleInfo) => {
            const dependencyComponent = processExternalModuleForBom(context, externalDependencyModuleInfo);
            component.dependencies.add(dependencyComponent.bomRef);
        });

        return component;
    }

    return {
        name: PLUGIN_ID,
        async buildStart() {
            // autoregister root entry when starting the build
            if (options.autodetect) {
                try {
                    this.debug(`Autodetection enabled, trying to resolve root component`);
                    const rootPkg = await readPackage(process.cwd());
                    if (rootPkg) {
                        this.info(`Detected root ${rootPkg.name} v${rootPkg.version}`);
                        rootPackageJson = rootPkg;
                        rootComponent = cdxComponentBuilder.makeComponent(
                            rootPkg,
                            options.rootComponentType as ComponentType,
                        );
                        rootComponent.version = rootPkg.version;
                        rootComponent.purl = cdxPurlFactory.makeFromComponent(rootComponent);
                        rootComponent.bomRef.value = rootComponent.purl?.toString();
                        bom.metadata.component = rootComponent;
                    }
                } catch (err) {
                    this.error({
                        message: `autodetection failed: ${err instanceof Error ? err.message : err}`,
                        meta: {
                            error: err,
                        },
                    });
                }
            }

            // add lifecycle on build start
            bom.metadata.lifecycles.add(CDX.Enums.LifecyclePhase.Build);

            if (options.saveTimestamp) {
                this.info(`Saving timestamp to SBOM`);
                bom.metadata.timestamp = new Date();
            }

            if (options.generateSerial) {
                this.info(`Generating random serial number for SBOM`);
                bom.serialNumber = CDX.Utils.BomUtility.randomSerialNumber();
            }

            // register known tools in the chain
            await autoRegisterTools(
                this,
                bom,
                cdxToolBuilder,
                options.collectLicenseEvidence && cdxLicenseEvidenceGatherer,
            );

            // apply custom information if configured
            if (options.beforeCollect) {
                this.debug('Applying custom transform "beforeCollect"');
                options.beforeCollect(bom);
            }
        },
        /**
         * We use this hook to load normalized package.json data and module specific info for each imported module.
         * As this hook runs in parallel before finishing the bundle, we can ensure that
         * all required package.json files are loaded before we start the BOM generation.
         */
        async moduleParsed(moduleInfo) {
            await aggregateDependencyInfoByModuleId(
                this,
                dependencyInfoRegistry,
                moduleInfo.id,
                options.collectLicenseEvidence && cdxLicenseEvidenceGatherer,
            );
        },
        /**
         * Build the SBOM and emit files
         */
        async generateBundle(_outputOptions, bundle) {
            const tree = await getAllExternalModules(this, bundle);
            for (const mod of tree) {
                processExternalModuleForBom(this, mod);
            }

            const formatMap: Record<string, CDX.Serialize.BaseSerializer<unknown>> = {
                json: jsonSerializer,
                xml: xmlSerializer,
            };

            if (options.afterCollect) {
                this.debug('Applying custom transform "afterCollect"');
                options.afterCollect(bom);
            }

            options.outFormats.forEach((format) => {
                if (!formatMap[format]) {
                    throw new Error(`Unsupported format: ${format}`);
                }

                // serialize the BOM and emit the file
                const sbomFilePath = join(options.outDir, `${options.outFilename}.${format}`);
                this.debug(`Emitting SBOM asset to ${sbomFilePath}`);
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
                this.debug(`Emitting well-known file to .well-known/sbom`);
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
