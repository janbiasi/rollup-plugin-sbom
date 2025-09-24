import type { PluginContext } from "rollup";
import * as CDX from "@cyclonedx/cyclonedx-library";

export function* getLicenseEvidence(
    context: PluginContext,
    packageDir: string,
    licenseEvidenceGatherer: CDX.Utils.LicenseUtility.LicenseEvidenceGatherer,
): Generator<CDX.Models.License> {
    try {
        const files =
            licenseEvidenceGatherer.getFileAttachments(packageDir, (error) => {
                context.debug(
                    `Collecting license attachments in ${packageDir} failed: ${error instanceof Error ? error.message : String(error)}`,
                );
            }) || [];

        for (const { file, text } of files) {
            yield new CDX.Models.NamedLicense(`file: ${file}`, { text });
        }
    } catch (error) {
        context.warn(
            `Collecting license evidence in ${packageDir} failed: ${error instanceof Error ? error.message : error}`,
        );
    }

    return;
}
