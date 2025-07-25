import type { PluginContext } from "rollup";

import { filterExternalModuleId } from "./analyzer";
import { getModulePathFromModuleId } from "./helpers";
import { ModulePathString, type ModuleIdString } from "./types/aliases";
import { findValidPackageJson } from "./package-finder";
import type { NormalizedPackageJson } from "./package-reader";

/**
 * The package registry holds references from module paths to normalized
 * package.json's in object form.
 */
export type PackageRegistry = Map<ModulePathString, NormalizedPackageJson>;

/**
 * Creates a new package registry
 */
export function createPackageRegistry(): PackageRegistry {
    return new Map<ModulePathString, NormalizedPackageJson>();
}

/**
 * Find the corresponding package.json based on a module path
 * @param {PluginContext} context The rollup plugin context
 * @param {PackageRegistry} registry The package registry where the package should be stored
 * @param {ModulePathString} modulePath The module path
 * @returns A normalized package object or null (if not found / virtual module)
 */
export async function aggregatePackageByModulePath(
    context: PluginContext,
    registry: PackageRegistry,
    modulePath: ModulePathString,
): Promise<NormalizedPackageJson | null> {
    // return the previous result if we already aggregated the package
    if (registry.has(modulePath)) {
        return registry.get(modulePath) ?? null;
    }

    // skip virtual and non-node-modules
    if (!filterExternalModuleId(modulePath)) {
        return null;
    }

    const result = await findValidPackageJson(context, modulePath);
    if (result) {
        registry.set(modulePath, result);
        return result;
    }

    return null;
}

/**
 * Find the closest package.json based on a module identifier, uses {@link aggregatePackageByModulePath} internally.
 * @param {PluginContext} context The rollup plugin context
 * @param {PackageRegistry} registry The package registry where the package should be stored
 * @param {ModuleIdString} moduleId The module id base
 * @returns A normalized package object or null (if not found / virtual module)
 */
export async function aggregatePackageByModuleId(
    context: PluginContext,
    registry: PackageRegistry,
    moduleId: ModuleIdString,
): Promise<NormalizedPackageJson | null> {
    const modulePath = getModulePathFromModuleId(moduleId);
    return aggregatePackageByModulePath(context, registry, modulePath);
}
