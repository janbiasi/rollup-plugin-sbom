/**
 * Type alias for module IDs, which are strings in Rollup.
 * This is for developers only to make it easier to identify module ID strings.
 */
export type ModuleIdString = string;

/**
 * Type alias for package IDs, which is a custom string format.
 * It consists of the package name, and the package version, separated by a `@` symbol.
 * @example "react@18.2.0"
 */
export type PackageId = `${string}@${string}`;
