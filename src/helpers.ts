import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";

import normalizePackageData, { type Package } from "normalize-package-data";
import { OrganizationalEntityOption } from "./types/OrganizationalEntityOption";
import * as CDX from "@cyclonedx/cyclonedx-library";
import { ResolvedId } from "rollup";

/**
 * Plugin identifier for {@link rollupPluginSbom}
 */
export const PLUGIN_ID = "rollup-plugin-sbom";

export function isResolvedIdBundled(resolvedId: ResolvedId): boolean {
    if (resolvedId.external === true) {
        // this is a peer-dependency in eg. a library case (= not bundled but imported)
        return false;
    }

    if (resolvedId.id.startsWith("\0")) {
        // this is an external module
        return false;
    }

    if (resolvedId.id.includes("node_modules")) {
        return true;
    }

    // TODO: is it better to not include dependencies if we don't know if it is included?
    console.warn(`Warning: could not verify if ${resolvedId.id} is bundled`);
    return false;
}

/**
 * Check if the provided moduleId resolves to an external module.
 * Will also return false if the module is a virtual module (start with "\0")
 * @param {string} moduleId Rollup module identifier (path to imported module)
 * @returns If the moduleId is an external module or not
 * @deprecated use rollups internal ID resolution with {@link isResolvedIdBundled}
 */
export function isExternalModuleId(moduleId: string): boolean {
    return moduleId.includes("node_modules") && !moduleId.startsWith("\0");
}

/**
 * Custom resolved module scheme for building the BOM
 */
export interface ResolvedModuleInfo {
    moduleId: string;
    pkg: Package;
    resolution: ResolvedId;
    dependencies?: Package[];
}

/**
 * Mark licenses on a component as declared
 * @param {CDX.Models.Component} component The component declaration
 */
export function markLicensesAsDeclared(component?: CDX.Models.Component): void {
    if (!component) {
        return;
    }

    component.licenses.forEach((l) => {
        l.acknowledgement = CDX.Enums.LicenseAcknowledgement.Declared;
    });
}

/**
 * Read and normalize a `package.json` under the defined `dir`
 * @param dir The directory to find the `package.json` file in
 */
export async function getPackageJson(dir: string): Promise<Package> {
    try {
        const rawPkg = await readFile(resolve(dir, "package.json"), "utf-8");
        const pkg = JSON.parse(rawPkg.toString());
        normalizePackageData(pkg);

        return pkg;
    } catch {
        return null;
    }
}

/**
 * Finds the package root of a certain imported module ID, which is the path to a
 * imported module (and not its root). So we need to scan directories upwards until we find a package.json
 * with a maximum limit set in traversal.
 * @param moduleId The imported module ID
 * @param traversalLimit The maximum number of directories to traverse upwards
 * @example
 * ```ts
 * const moduleId = "/User/home/.pnpm/react-dom@18.2.0_react@18.2.0/node_modules/react-dom/index.js";
 * getPackageRootFromModuleId(moduleId); // "/User/home/.pnpm/react-dom@18.2.0_react@18.2.0/node_modules/react-dom"
 * ```
 */
export async function getCorrespondingPackageFromModuleId(
    modulePath: string,
    traversalLimit = 10,
): Promise<Package | null> {
    if (traversalLimit === 0) {
        return Promise.resolve(null);
    }

    // dirname() will do the equivalent of traversing up the
    // directory tree one level when called on a path without
    // a file.
    const folder = dirname(modulePath);
    const potentialPackagePath = join(folder, "./package.json");

    let pkgJson: Package | null = null;

    if (existsSync(potentialPackagePath)) {
        pkgJson = await getPackageJson(folder);
    }

    // some packages don't have names and act just as loader proxy - but we need to find
    // the root module so we only resolve if we have the package, a name and a version
    if (pkgJson !== null && pkgJson.version && pkgJson.name) {
        return pkgJson;
    }

    return await getCorrespondingPackageFromModuleId(folder, traversalLimit - 1);
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
