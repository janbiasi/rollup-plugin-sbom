import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";

import normalizePackageData, { type Package } from "normalize-package-data";
import { OrganizationalEntityOption } from "./types/OrganizationalEntityOption";
import * as CDX from "@cyclonedx/cyclonedx-library";

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
export function getCorrespondingPackageFromModuleId(moduleId: string, traversalLimit = 10) {
    if (!moduleId.includes("node_modules")) {
        return Promise.resolve(null);
    }

    if (traversalLimit === 0) {
        return Promise.resolve(null);
    }

    const folder = dirname(moduleId);
    const potentialPackagePath = join(folder, "./package.json");
    if (existsSync(potentialPackagePath)) {
        return getPackageJson(folder);
    }

    return getCorrespondingPackageFromModuleId(join(folder, ".."), traversalLimit - 1);
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
