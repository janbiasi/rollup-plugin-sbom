import fs from "node:fs/promises";
import path from "node:path";
import normalizePackageData, { type Package } from "normalize-package-data";

export type NormalizedPackageJson = Package;

/**
 * Read a normalized package.json as object from a directory or file path
 * @param {string} dirOrFilePath The directory or package path to use
 * @returns A normalized package.json object
 */
export async function readPackage(dirOrFilePath: string): Promise<NormalizedPackageJson> {
    const packagePath = dirOrFilePath.endsWith(`${path.sep}package.json`)
        ? path.resolve(dirOrFilePath)
        : path.resolve(dirOrFilePath, "package.json");
    const packageFile = await fs.readFile(packagePath, "utf8");
    return parsePackage(packageFile);
}

/**
 * Parses a JSON string of package.json format into a normalized package object via {@link normalizePackageData}
 * @param {string} packageFile The package.json file content
 * @returns A normalized package.json object
 */
export function parsePackage(packageFile: string): NormalizedPackageJson {
    if (typeof packageFile !== "string") {
        throw new TypeError(`packageFile should be a string (received ${typeof packageFile}).`);
    }

    const pkg = JSON.parse(packageFile);
    normalizePackageData(pkg, null, false);
    return pkg;
}
