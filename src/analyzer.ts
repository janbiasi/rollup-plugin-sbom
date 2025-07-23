import type { ModuleInfo, OutputBundle, PluginContext } from "rollup";
import { getCorrespondingPackageFromModuleId } from "./helpers";
import type { Package } from "normalize-package-data";
import type { ModuleIdString } from "./types/aliases";

/**
 * Information about an external module.
 */
export interface ExternalModuleInfo {
    moduleId: ModuleIdString;
    parentModuleId?: ModuleIdString;
    moduleInfo: ModuleInfo;
    pkg: Package;
    dependsOn: ExternalModuleInfo[];
}

/**
 * Filter out virtual modules and non-node_modules
 * @param value The module ID to filter
 * @returns True if the module ID is a valid external module, false otherwise
 */
function filterExternalModuleId(value: ModuleIdString): boolean {
    if (value.startsWith("\0")) {
        return false;
    }

    if (value.includes("node_modules")) {
        return true;
    }

    return false;
}

async function resolveExternalModule(
    context: PluginContext,
    moduleId: ModuleIdString,
    parentModuleId?: ModuleIdString,
): Promise<ExternalModuleInfo> {
    const dependsOnModuleIds = [
        ...(context.getModuleInfo(moduleId)?.importedIds ?? []),
        ...(context.getModuleInfo(moduleId)?.dynamicallyImportedIds ?? []),
    ].filter(filterExternalModuleId);

    const pkg = await getCorrespondingPackageFromModuleId(moduleId);
    if (!pkg) {
        context.debug({
            message: `Could not resolve package for module "${moduleId}"`,
            meta: { moduleId },
        });
    }

    return {
        moduleId,
        parentModuleId,
        moduleInfo: context.getModuleInfo(moduleId),
        pkg,
        dependsOn: await Promise.all(
            dependsOnModuleIds.map((id) => resolveExternalModule(context, id, moduleId))
        ),
    };
}

export async function getAllExternalModules(
    context: PluginContext,
    bundle: OutputBundle,
): Promise<ExternalModuleInfo[]> {
    const allModules: ExternalModuleInfo[] = [];

    for (const [id, module] of Object.entries(bundle)) {
        if (module.type === "asset") {
            context.debug({
                message: `Skipping asset "${id}"`,
                meta: {
                    moduleId: id,
                    module,
                },
            });
            continue;
        }

        context.debug({
            message: `Processing generated module "${id}"`,
            meta: {
                moduleId: id,
                module,
            },
        });

        const externalModulesWithinBundle = await Promise.all(
            [...module.moduleIds, ...module.dynamicImports]
                .filter(filterExternalModuleId) // virtual modules are not included
                .map((moduleId) => resolveExternalModule(context, moduleId, id)), // resolve module information
        );

        context.debug({
            message: `Found ${externalModulesWithinBundle.length} external modules within "${id}"`,
            meta: {
                moduleId: id,
                modules: externalModulesWithinBundle,
            },
        });

        allModules.push(...externalModulesWithinBundle);
    }

    const allUniqueModules = allModules.filter(
        (m, index, self) => index === self.findIndex((t) => t.pkg?.name === m.pkg?.name),
    );

    context.debug({
        message: `Found ${allUniqueModules.length} unique external modules accross all bundles`,
        meta: {
            allUniqueModules,
        },
    });

    return allUniqueModules;
}
