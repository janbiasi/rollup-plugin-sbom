import { dirname } from "node:path";
import * as CDX from "@cyclonedx/cyclonedx-library";

import { OrganizationalEntityOption } from "./types/OrganizationalEntityOption";
import type { ModuleIdString, ModulePathString, PackageId } from "./types/aliases";
import type { NormalizedPackageJson } from "./package-reader";

/**
 * Plugin identifier for {@link rollupPluginSbom}
 */
export const PLUGIN_ID = "rollup-plugin-sbom";

/**
 * Returns the folder path from a module id
 * @param moduleId The module id
 * @returns The path to the imported module
 */
export function getModulePathFromModuleId(moduleId: ModuleIdString): ModulePathString {
    return dirname(moduleId);
}

/**
 * Generate a package ID from a package object
 * @param pkg The package object
 * @returns A package ID
 */
export function generatePackageId(pkg: NormalizedPackageJson): PackageId {
    return `${pkg.name}@${pkg.version}`;
}

/**
 * CycloneDX requires the use of their models and repositories, but we want to provide
 * easy usage for the developers so we need to convert our simple interface to the corresponding models
 * @param {OrganizationalEntityOption} option The option to convert
 * @returns A CycloneDX {@link CDX.Models.OrganizationEntity}
 */
export function convertOrganizationalEntityOptionToModel(option: OrganizationalEntityOption) {
    return new CDX.Models.OrganizationalEntity({
        name: option.name,
        url: new Set(option.url),
        contact: new CDX.Models.OrganizationalContactRepository(
            option.contact.map((contact) => new CDX.Models.OrganizationalContact(contact)),
        ),
    });
}
