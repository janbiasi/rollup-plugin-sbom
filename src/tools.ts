import { createRequire } from "node:module";
import { type Builders, type Models } from "@cyclonedx/cyclonedx-library";
import type { PluginContext } from "rollup";

import { aggregatePackageByModuleId, createPackageRegistry } from "./package-registry";

const require = createRequire(import.meta.url);

const knownTools = ["rollup-plugin-sbom", "vite", "rollup"];

export async function autoRegisterTools(
    context: PluginContext,
    bom: Models.Bom,
    builder: Builders.FromNodePackageJson.ToolBuilder,
) {
    // we use a separate package registry for tool detection
    const toolPackageRegistry = createPackageRegistry();

    async function registerTool(packageName: string) {
        try {
            const toolModulePath = require.resolve(packageName);
            const pkgJson = await aggregatePackageByModuleId(context, toolPackageRegistry, toolModulePath);
            if (pkgJson) {
                const tool = builder.makeTool(pkgJson);
                if (tool) {
                    context.info({
                        message: `Registering tool "${tool?.name}" in SBOM`,
                        meta: {
                            packageName,
                        },
                    });
                    bom.metadata.tools.tools.add(tool);
                }
            }
        } catch {
            // do nothing
        }
    }

    for (const pkgName of knownTools) {
        context.debug(`Trying to autoregister tool "${pkgName}"`);
        await registerTool(pkgName);
    }
}
