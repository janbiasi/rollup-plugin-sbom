import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";

import { type Builders, type Models, type Factories } from "@cyclonedx/cyclonedx-library";
import { getPackageJson } from "./helpers";

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
    // register rollup-plugin-sbom (for vite and rollup)
    const pkg = await getPackageJson(resolve(".."));
    if (pkg) {
        const tool = builder.makeTool(pkg);
        tool && bom.metadata.tools.add(tool);
    }

    // register vite if available
    const vitePkg = await getPackageJson(dirname(require.resolve("vite")));
    if (vitePkg) {
        const tool = builder.makeTool(vitePkg);
        tool && bom.metadata.tools.add(tool);
    }

    // register rollup if available
    const rollupPkg = await getPackageJson(dirname(require.resolve("rollup")));
    if (rollupPkg) {
        const tool = builder.makeTool(rollupPkg);
        tool && bom.metadata.tools.add(tool);
    }
}
