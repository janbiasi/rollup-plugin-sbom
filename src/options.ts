import { Enums, Spec } from "@cyclonedx/cyclonedx-library";

export interface RollupPluginSbomOptions {
    /**
     * Specification version to use, defaults to {@link Spec.Spec1dot5}
     */
    specVersion?: Spec.Version;
    /**
     * Defaults to Application
     */
    rootComponentType?: Enums.ComponentType;
    /**
     * Output directory to use, defaults to `"cyclonedx"`.
     * Note: you don't need to prefix the build output path as the plugin
     * uses the internal file emitter to write files.
     */
    outDir?: string;
    /**
     * The base filename for the SBOM files, defaults to 'bom'
     */
    outFilename?: string;
    /**
     * The formats to output, defaults to ['json', 'xml']
     */
    outFormats?: ('json' | 'xml')[];
    /**
     * If you want to save the timestamp of the generation, defaults to `true`
     */
    saveTimestamp?: boolean;
    /**
     * If you want to get the root package registered automatically, defaults to `true`.
     * You may set this to `false` if your project does not a have a `package.json`
     */
    autodetect?: boolean;
    /**
     * Whether to generate a serial number for the BOM. Defaults to `false`.
     */
    generateSerial?: boolean;
    /**
     * Whether to generate a SBOM in the `.well-known` directory. Defaults to `true`.
     */
    includeWellKnown?: boolean;
}

export const DEFAULT_OPTIONS: Required<RollupPluginSbomOptions> = {
    specVersion: Spec.Version.v1dot5,
    rootComponentType: Enums.ComponentType.Application,
    outDir: "cyclonedx",
    outFilename: "bom",
    outFormats: ["json", "xml"],
    saveTimestamp: true,
    autodetect: true,
    generateSerial: false,
    includeWellKnown: true,
};
