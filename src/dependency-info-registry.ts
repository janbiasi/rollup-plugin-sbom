import type { PluginContext } from "rollup";
import * as CDX from "@cyclonedx/cyclonedx-library";

import { filterExternalModuleId } from "./analyzer";
import { getModulePathFromModuleId } from "./helpers";
import { ModulePathString, type ModuleIdString } from "./types/aliases";
import { findValidPackageJson } from "./package-finder";
import type { NormalizedPackageJson } from "./package-reader";
import { getLicenseEvidence } from "./license-evidence";

export interface DependencyInfo {
    pkg: NormalizedPackageJson;
    path: string;
    licenseEvidence: Array<CDX.Models.License>;
}

/**
 * The dependency info registry holds references of:
 * - Root module path
 * - Normalized package.json's in object form
 * - License evidence list
 */
export type DependencyInfoRegistry = Map<ModulePathString, DependencyInfo>;

/**
 * Creates a new dependency info registry
 */
export function createDependencyInfoRegistry(): DependencyInfoRegistry {
    return new Map();
}

/**
 * Find the corresponding package.json based on a module path
 * @param {PluginContext} context The rollup plugin context
 * @param {DependencyInfoRegistry} registry The package registry where the package should be stored
 * @param {ModulePathString} modulePath The module path
 * @param {CDX.Utils.LicenseUtility.LicenseEvidenceGatherer} licenseEvidenceGatherer License evidence gatherer; will collect license evidence if set
 * @returns A normalized dependency info object or null (if not found / virtual module)
 */
export async function aggregateDependencyInfoByModulePath(
    context: PluginContext,
    registry: DependencyInfoRegistry,
    modulePath: ModulePathString,
    licenseEvidenceGatherer?: CDX.Utils.LicenseUtility.LicenseEvidenceGatherer,
): Promise<DependencyInfo | null> {
    // return the previous result if we already aggregated the package
    if (registry.has(modulePath)) {
        return registry.get(modulePath) ?? null;
    }

    // skip virtual and non-node-modules
    if (!filterExternalModuleId(modulePath)) {
        return null;
    }

    // try to find a valid package.json within
    const dependencyPackage = await findValidPackageJson(context, modulePath);
    if (!dependencyPackage) {
        return null;
    }

    // collect license evidence if a gatherer is set
    const licenseEvidenceList: Array<CDX.Models.License> = licenseEvidenceGatherer
        ? Array.from(getLicenseEvidence(context, dependencyPackage.path, licenseEvidenceGatherer))
        : [];

    const info: DependencyInfo = {
        path: dependencyPackage.path,
        pkg: dependencyPackage.package,
        licenseEvidence: licenseEvidenceList,
    };
    registry.set(modulePath, info);
    return info;
}

/**
 * Find the closest package.json based on a module identifier, uses {@link aggregateDependencyInfoByModulePath} internally.
 * @param {PluginContext} context The rollup plugin context
 * @param {DependencyInfoRegistry} registry The package registry where the package should be stored
 * @param {ModuleIdString} moduleId The module id base
 * @param {CDX.Utils.LicenseUtility.LicenseEvidenceGatherer} licenseEvidenceGatherer License evidence gatherer; will collect license evidence if set
 * @returns A normalized dependency info object or null (if not found / virtual module)
 */
export async function aggregateDependencyInfoByModuleId(
    context: PluginContext,
    registry: DependencyInfoRegistry,
    moduleId: ModuleIdString,
    licenseEvidenceGatherer?: CDX.Utils.LicenseUtility.LicenseEvidenceGatherer,
): Promise<DependencyInfo | null> {
    const modulePath = getModulePathFromModuleId(moduleId);
    return aggregateDependencyInfoByModulePath(context, registry, modulePath, licenseEvidenceGatherer);
}
