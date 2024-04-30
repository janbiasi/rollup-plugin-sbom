import { createRequire } from "node:module";

import { type Builders, type Models, type Factories } from "@cyclonedx/cyclonedx-library";
import { getCorrespondingPackageFromModuleId } from "./helpers";

const require = createRequire(import.meta.url);

export function registerPackageUrlOnComponent(
    component: Models.Component | undefined,
    factory: Factories.FromNodePackageJson.PackageUrlFactory,
) {
    if (component) {
        component.purl = factory.makeFromComponent(component);
        component.bomRef.value = component.purl?.toString();
    }
}

export async function registerTools(bom: Models.Bom, builder: Builders.FromNodePackageJson.ToolBuilder) {
    async function registerTool(packageName: string) {
        try {
            const modulePath = require.resolve(packageName);
            const pkgJson = await getCorrespondingPackageFromModuleId(modulePath);
            if (pkgJson) {
                const tool = builder.makeTool(pkgJson);
                tool && bom.metadata.tools.add(tool);
            }
        } catch {
            // do nothing
        }
    }

    const knownTools = ["rollup-plugin-sbom", "vite", "rollup"];

    for (const pkgName of knownTools) {
        await registerTool(pkgName);
    }
}
