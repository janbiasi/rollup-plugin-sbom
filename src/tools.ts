import { createRequire } from "node:module";
import * as CDX from "@cyclonedx/cyclonedx-library";
import type { PluginContext } from "rollup";

import { aggregateDependencyInfoByModulePath, createDependencyInfoRegistry } from "./dependency-info-registry";

const require = createRequire(import.meta.url);

/**
 * A list of package names which will be looked up within the project
 * and push them to the tools list within the SBOM.
 */
const knownTools = ["rollup-plugin-sbom", "vite", "rollup"];

/**
 * Automatically register common tools related to the build process on a BOM model
 *
 * @since 1.0.0
 * @param {PluginContext} context The rollup plugin context
 * @param {CDX.Models.Bom} bom The root BOM to attach tools to
 * @param {CDX.Builders.FromNodePackageJson.ToolBuilder} builder The CDX tool builder instance
 * @param {CDX.Utils.LicenseUtility.LicenseEvidenceGatherer} [licenseEvidenceGatherer] Optional: enable license evidence gathering
 */
export async function autoRegisterTools(
    context: PluginContext,
    bom: CDX.Models.Bom,
    builder: CDX.Builders.FromNodePackageJson.ToolBuilder,
    licenseEvidenceGatherer?: CDX.Utils.LicenseUtility.LicenseEvidenceGatherer,
) {
    // we use a separate package registry for tool detection
    const toolPackageRegistry = createDependencyInfoRegistry();

    async function registerTool(packageName: string) {
        try {
            // try to find the tool within the project
            const toolModulePath = require.resolve(packageName);
            const dependencyInfo = await aggregateDependencyInfoByModulePath(
                context,
                toolPackageRegistry,
                toolModulePath,
                licenseEvidenceGatherer,
            );

            // register the tool within the BOM
            if (dependencyInfo && dependencyInfo.pkg) {
                const tool = builder.makeTool(dependencyInfo.pkg);
                if (tool) {
                    context.info({
                        message: `Registering tool "${tool?.name}" in SBOM`,
                        meta: {
                            dependencyInfo,
                        },
                    });
                    bom.metadata.tools.tools.add(tool);
                }
            }
        } catch (error) {
            context.warn(`Error during auto-registration of tool "${packageName}": ${error}`);
        }
    }

    await Promise.all(
        knownTools.map(async (pkgName) => {
            context.debug(`Trying to autoregister tool "${pkgName}"`);
            await registerTool(pkgName);
        }),
    );
}
