import fs from "node:fs/promises";
import path from "node:path";
import type { PluginContext } from "rollup";

import { readPackage, type NormalizedPackageJson } from "./package-reader";

export interface PackageFinderResult {
    /**
     * The root module directory
     */
    path: string;
    /**
     * The normalized package.json content as object
     */
    package: NormalizedPackageJson;
}

/**
 * Searches up the directory tree to find a valid package.json.
 * The search is stopped if a '.git' directory is found, marking the project root.
 * @param {PluginContext} context The rollup plugin context
 * @param {string} startDir The directory to start searching from.
 * @returns {Promise<PackageFinderResult | null>} The parsed package.json object or null.
 */
export async function findValidPackageJson(
    context: PluginContext,
    startDir: string,
): Promise<PackageFinderResult | null> {
    let currentDir = startDir;

    while (path.dirname(currentDir) !== currentDir) {
        const pkgPath = path.join(currentDir, "package.json");

        try {
            const pkgJsonStat = await fs.stat(pkgPath);
            if (!pkgJsonStat.isFile()) {
                currentDir = path.dirname(currentDir);
                continue;
            }

            const pkg = await readPackage(pkgPath);
            if (pkg.name && pkg.version) {
                return {
                    path: path.dirname(pkgPath),
                    package: pkg,
                };
            }
        } catch {
            // no package.json file here, continue lookup
        }

        try {
            // abort loop if we reach the project root (".git" folder present)
            const gitDirStat = await fs.stat(path.join(currentDir, ".git"));
            if (gitDirStat.isDirectory()) {
                context.warn(
                    `Package finder did not find any result and reached the git directory while resolving ${startDir}`,
                );
                break;
            }
        } catch {
            // project root not reached
        }

        currentDir = path.dirname(currentDir);
    }

    return null;
}
