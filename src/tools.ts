import { createRequire } from "node:module";
import { join } from "node:path";
import * as CDX from "@cyclonedx/cyclonedx-library";
import type { PluginContext } from "rollup";

import { aggregateDependencyInfoByModulePath, createDependencyInfoRegistry } from "./dependency-info-registry";

/**
 * A list of package names which will be looked up within the project
 * and push them to the tools list within the SBOM, along with the component
 * type they are registered as (bundlers are applications, the plugin is a library).
 */
const knownTools = [
    ["rollup-plugin-sbom", CDX.Enums.ComponentType.Library],
    ["vite", CDX.Enums.ComponentType.Application],
    ["rollup", CDX.Enums.ComponentType.Application],
    ["rolldown", CDX.Enums.ComponentType.Application],
] as const;

/**
 * Automatically register common tools related to the build process on a BOM model.
 *
 * Tools are registered as components, the serializer emits them as `metadata.tools.components`
 * for CycloneDX 1.5+ and falls back to the legacy tools list for older spec versions.
 *
 * @since 1.0.0
 * @param {PluginContext} context The rollup plugin context
 * @param {CDX.Models.Bom} bom The root BOM to attach tools to
 * @param {CDX.Contrib.FromNodePackageJson.Builders.ComponentBuilder} builder The CDX component builder instance
 * @param {CDX.Contrib.License.Utils.LicenseEvidenceGatherer} [licenseEvidenceGatherer] Optional: enable license evidence gathering
 */
export async function autoRegisterTools(
    context: PluginContext,
    bom: CDX.Models.Bom,
    builder: CDX.Contrib.FromNodePackageJson.Builders.ComponentBuilder,
    licenseEvidenceGatherer?: CDX.Contrib.License.Utils.LicenseEvidenceGatherer,
) {
    // we use a separate package registry for tool detection
    const toolPackageRegistry = createDependencyInfoRegistry();
    const projectRequire = createRequire(join(process.cwd(), "package.json"));

    async function registerTool(packageName: string, componentType: CDX.Enums.ComponentType) {
        try {
            // try to find the tool within the project
            const toolModulePath = projectRequire.resolve(packageName);
            const dependencyInfo = await aggregateDependencyInfoByModulePath(
                context,
                toolPackageRegistry,
                toolModulePath,
                licenseEvidenceGatherer,
            );

            // register the tool within the BOM
            if (dependencyInfo && dependencyInfo.pkg) {
                const tool = builder.makeComponent(dependencyInfo.pkg, componentType);
                if (tool) {
                    context.info({
                        message: `Registering tool "${tool?.name}" in SBOM`,
                        meta: {
                            dependencyInfo,
                        },
                    });
                    bom.metadata.tools.components.add(tool);
                }
            }
        } catch (error) {
            context.warn(`Error during auto-registration of tool "${packageName}": ${error}`);
        }
    }

    for (const [pkgName, componentType] of knownTools) {
        context.debug(`Trying to autoregister tool "${pkgName}"`);
        await registerTool(pkgName, componentType);
    }
}
