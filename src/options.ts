import * as CDX from "@cyclonedx/cyclonedx-library";

export interface RollupPluginSbomOptions {
    /**
     * Specification version to use
     * @default CDX.Spec.Spec1dot5
     */
    specVersion?: CDX.Spec.Version;
    /**
     * Component type of the compiled software
     * @default CDX.Enums.ComponentType.Application
     */
    rootComponentType?: CDX.Enums.ComponentType;
    /**
     * Output directory to use.
     * Note: you don't need to prefix the build output path as the plugin
     * uses the internal file emitter to write files.
     * @default "cyclonedx"
     */
    outDir?: string;
    /**
     * The base filename for the SBOM files
     * @default "bom"
     */
    outFilename?: string;
    /**
     * The formats to output
     * @default ["json", "xml"]
     */
    outFormats?: ("json" | "xml")[];
    /**
     * If you want to save the timestamp of the generation
     * @default true
     */
    saveTimestamp?: boolean;
    /**
     * If you want to get the root package registered automatically.
     * You may set this to `false` if your project does not a have a `package.json`
     * @default true
     */
    autodetect?: boolean;
    /**
     * Whether to generate a serial number for the BOM
     * @default false
     */
    generateSerial?: boolean;
    /**
     * Whether to generate a SBOM in the `.well-known` directory.
     * @default true
     */
    includeWellKnown?: boolean;
}

export const DEFAULT_OPTIONS: Required<RollupPluginSbomOptions> = {
    specVersion: CDX.Spec.Version.v1dot5,
    rootComponentType: CDX.Enums.ComponentType.Application,
    outDir: "cyclonedx",
    outFilename: "bom",
    outFormats: ["json", "xml"],
    saveTimestamp: true,
    autodetect: true,
    generateSerial: false,
    includeWellKnown: true,
};
