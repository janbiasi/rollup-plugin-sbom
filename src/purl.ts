import { PackageURL, PurlQualifierNames, PurlQualifiers } from "packageurl-js";
import { Utils as FromNodePackageJsonUtils } from "@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson";

import { NormalizedPackageJson } from "./package-reader";

/**
 * Compose PURLs from a normalized package.json declaration.
 * @param {NormalizedPackageJson} packageJson The normalized package data
 * @see https://github.com/CycloneDX/cyclonedx-webpack-plugin/blob/master/src/factories.ts
 * @see https://github.com/CycloneDX/cyclonedx-javascript-library/releases/tag/v10.0.0
 */
export function composePackageUrlFromPackageJson(packageJson: NormalizedPackageJson) {
    let name: string = packageJson.name;
    let namespace: string | undefined = undefined;

    if (name.startsWith("@")) {
        const nameParts = name.split("/");
        namespace = nameParts.shift();
        name = nameParts.join("/");
    }

    const qualifiers: PurlQualifiers = {};
    // "dist" might be used in bundled dependencies' manifests (https://blog.npmjs.org/post/172999548390/new-pgp-machinery)
    const { tarball } = packageJson.dist ?? {};

    if (typeof tarball === "string" && tarball.length > 5) {
        if (!FromNodePackageJsonUtils.defaultRegistryMatcher.test(tarball)) {
            qualifiers[PurlQualifierNames.DownloadUrl] = tarball;
        }
    } else if (typeof packageJson.repository === "object") {
        try {
            const url = new URL(packageJson.repository.url);
            const subdir =
                /* @ts-expect-error - missing type docs */
                packageJson.repository.directory;
            if (typeof subdir === "string") {
                url.hash = subdir;
            }
            qualifiers[PurlQualifierNames.VcsUrl] = url.toString();
        } catch {
            /* pass */
        }
    }

    try {
        return new PackageURL("npm", namespace, name, packageJson.version, qualifiers, undefined);
    } catch {
        return undefined;
    }
}
