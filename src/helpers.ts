import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import normalizePackageData, { type Package } from "normalize-package-data";
import * as CDX from "@cyclonedx/cyclonedx-library";

import { OrganizationalEntityOption } from "./types/OrganizationalEntityOption";
import type { ModuleIdString, PackageId } from "./types/aliases";

/**
 * Plugin identifier for {@link rollupPluginSbom}
 */
export const PLUGIN_ID = "rollup-plugin-sbom";

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
    // see https://github.com/janbiasi/rollup-plugin-sbom/issues/169
    if (pkgJson !== null && pkgJson.version && pkgJson.name) {
        return pkgJson;
    }

    return await getCorrespondingPackageFromModuleId(folder, traversalLimit - 1);
}

/**
 * Generate a package ID from a package object
 * @param pkg The package object
 * @returns A package ID
 */
export function generatePackageId(pkg: Package): PackageId {
    return `${pkg.name}@${pkg.version}`;
}

/**
 * Compose a readable module ID from a module ID
 * @param moduleId The module ID
 * @returns A readable module ID
 */
export function composeReadableModuleId(moduleId: ModuleIdString): string {
    return moduleId.replace("\0", "").split("/node_modules/")[1];
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
