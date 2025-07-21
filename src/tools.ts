import { createRequire } from "node:module";

import { type Builders, type Models } from "@cyclonedx/cyclonedx-library";
import type { PluginContext } from "rollup";

import { getCorrespondingPackageFromModuleId } from "./helpers";

const require = createRequire(import.meta.url);

const knownTools = ["rollup-plugin-sbom", "vite", "rollup"];

export async function autoRegisterTools(
    context: PluginContext,
    bom: Models.Bom,
    builder: Builders.FromNodePackageJson.ToolBuilder,
) {
    async function registerTool(packageName: string) {
        try {
            const modulePath = require.resolve(packageName);
            const pkgJson = await getCorrespondingPackageFromModuleId(modulePath);
            if (pkgJson) {
                const tool = builder.makeTool(pkgJson);
                if (tool) {
                    context.debug({
                        message: `Registering tool ${tool?.name}`,
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
        await registerTool(pkgName);
    }
}
