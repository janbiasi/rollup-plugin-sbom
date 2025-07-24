import { join } from "node:path";

import type { Plugin, PluginContext } from "rollup";
import * as CDX from "@cyclonedx/cyclonedx-library";
import type { ComponentType } from "@cyclonedx/cyclonedx-library/Enums";

import { getPackageJson, convertOrganizationalEntityOptionToModel, PLUGIN_ID, generatePackageId } from "./helpers";
import { autoRegisterTools } from "./tools";
import { DEFAULT_OPTIONS, type RollupPluginSbomOptions } from "./options";
import { getAllExternalModules } from "./analyzer";
import type { PackageId } from "./types/aliases";
import type { ExternalModuleInfo } from "./analyzer";

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
     */
    const registeredModules = new Map<PackageId, CDX.Models.Component>();

    function processExternalModuleForBom(context: PluginContext, mod: ExternalModuleInfo) {
        const packageId = generatePackageId(mod.pkg);
        if (registeredModules.has(packageId)) {
            return registeredModules.get(packageId);
        }

        context.debug({
            message: `Processing ${mod.pkg.name} (imported by ${mod.moduleId} - depends on ${mod.dependsOn?.map((d) => d.pkg?.name).join(", ") || "none"})`,
            meta: {
                moduleId: mod.moduleId,
            },
        });

        const component = cdxComponentBuilder.makeComponent(mod.pkg);
        component.purl = cdxPurlFactory.makeFromComponent(component);
        component.bomRef.value = component.purl?.toString();
        component.licenses.forEach((l) => {
            l.acknowledgement = CDX.Enums.LicenseAcknowledgement.Declared;
        });
        registeredModules.set(packageId, component);
        bom.components.add(component);

        if (mod.dependsOn?.length > 0) {
            mod.dependsOn.forEach((externalDependencyModuleInfo) => {
                context.debug({
                    message: `Attaching nested dependency "${externalDependencyModuleInfo.pkg.name}" to parent component ${mod.pkg?.name}`,
                    meta: {
                        moduleId: externalDependencyModuleInfo.moduleId,
                        parentModuleId: mod.moduleId,
                    },
                });

                const dependencyComponent = processExternalModuleForBom(context, externalDependencyModuleInfo);
                component.dependencies.add(dependencyComponent.bomRef);
            });
        }

        return component;
    }

    return {
        name: PLUGIN_ID,
        async buildStart() {
            // autoregister root entry when starting the build
            if (options.autodetect) {
                try {
                    this.debug({
                        message: `Autodetection enabled, trying to resolve root component`,
                        meta: {
                            cwd: process.cwd(),
                        },
                    });
                    const rootPkg = await getPackageJson(process.cwd());
                    if (rootPkg) {
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
                        message: "could not autodetect package.json in the current working directory",
                        meta: {
                            error: err,
                        },
                    });
                }
            }

            // add lifecycle if we build
            bom.metadata.lifecycles.add(CDX.Enums.LifecyclePhase.Build);

            if (options.saveTimestamp) {
                this.debug(`Saving timestamp to SBOM`);
                bom.metadata.timestamp = new Date();
            }

            if (options.generateSerial) {
                this.debug(`Generating serial number for SBOM`);
                bom.serialNumber = CDX.Utils.BomUtility.randomSerialNumber();
            }

            // register known tools in the chain
            await autoRegisterTools(this, bom, cdxToolBuilder);

            // apply custom information if configured
            if (options.beforeCollect) {
                this.debug('Applying custom transform "beforeCollect"');
                options.beforeCollect(bom);
            }
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
