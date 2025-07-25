import type { ModuleInfo, OutputBundle, PluginContext } from "rollup";

import type { ModuleIdString, ModulePathString } from "./types/aliases";
import { getModulePathFromModuleId } from "./helpers";

/**
 * Information about an external module.
 */
export interface ExternalModuleInfo {
    /**
     * The module identifier of the module
     */
    moduleId: ModuleIdString;
    /**
     * If the external module has a parent, this field
     * will be set to the parent's module identifier.
     */
    parentModuleId?: ModuleIdString;
    /**
     * Module info retrieved from rollup
     * @see https://rollupjs.org/plugin-development/#this-getmoduleinfo
     */
    moduleInfo: ModuleInfo;
    /**
     * The module base path (dirname) for the module id
     */
    modulePath: ModulePathString;
    /**
     * Available valid external modules which are either directly
     * imported or imported dynamically.
     */
    dependsOn: ExternalModuleInfo[];
}

/**
 * Filter out virtual modules and non-node_modules
 * @param value The module ID to filter
 * @returns True if the module ID is a valid external module, false otherwise
 * @see https://rollupjs.org/plugin-development/#conventions
 */
export function filterExternalModuleId(value: ModuleIdString): boolean {
    // Ignore virtual modules or files
    if (value.startsWith("\0") || value.includes("\u0000")) {
        return false;
    }

    // Ignore modules outside of node_modules
    if (value.includes("node_modules")) {
        return true;
    }

    return false;
}

async function resolveExternalModule(
    context: PluginContext,
    moduleId: ModuleIdString,
    parentModuleId: ModuleIdString,
    transitiveResolveLimit: number,
): Promise<ExternalModuleInfo | null> {
    if (transitiveResolveLimit === 0) {
        return null;
    }

    const moduleInfo = context.getModuleInfo(moduleId);
    const dependsOnModuleIds = [
        ...(moduleInfo?.importedIds ?? []),
        ...(moduleInfo?.dynamicallyImportedIds ?? []),
    ].filter(filterExternalModuleId);

    return {
        moduleId,
        parentModuleId,
        moduleInfo,
        modulePath: getModulePathFromModuleId(moduleId),
        dependsOn: await Promise.all(
            dependsOnModuleIds.map((id) => resolveExternalModule(context, id, moduleId, transitiveResolveLimit - 1)),
        ).then((allModuleIdsOrNull) => allModuleIdsOrNull.filter(Boolean)),
    };
}

export async function getAllExternalModules(
    context: PluginContext,
    bundle: OutputBundle,
    transitiveResolveLimit = 2,
): Promise<Set<ExternalModuleInfo>> {
    const allModules = new Set<ExternalModuleInfo>();

    for (const [id, module] of Object.entries(bundle)) {
        // we do not want to process assets (non-js/ts files)
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

        const importedUniqueModuleIds = new Set([...module.moduleIds, ...module.dynamicImports]);
        context.debug({
            message: `Analyzing generated chunk "${id}" (${importedUniqueModuleIds.size} imported ids)`,
            meta: {
                moduleId: id,
                module,
            },
        });

        const externalModulesWithinBundle = await Promise.all(
            [...importedUniqueModuleIds]
                .filter(filterExternalModuleId) // virtual modules are not included
                .map((moduleId) => resolveExternalModule(context, moduleId, id, transitiveResolveLimit)), // resolve module information
        ).then((allModules) => allModules.filter(Boolean));

        context.debug({
            message: `Found ${externalModulesWithinBundle.length} external entries within "${id}"`,
            meta: {
                moduleId: id,
                modules: externalModulesWithinBundle,
            },
        });

        externalModulesWithinBundle.forEach(allModules.add, allModules);
    }

    context.debug({
        message: `Aggregated ${allModules.size} unique external entries accross all chunks`,
        meta: {
            allModules,
        },
    });

    return allModules;
}
