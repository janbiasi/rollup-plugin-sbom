import { Enums, Models, Spec } from "@cyclonedx/cyclonedx-library";

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
     * If you want to save the timestamp of the generation, defaults to `true`
     */
    saveTimestamp?: boolean;
    /**
     * If you want to get the root package registered automatically, defaults to `true`.
     * You may set this to `false` if your project does not a have a `package.json`
     */
    autodetect?: boolean;
    /**
     * If the tool should add a random serial number for the application, defaults to `false`
     */
    generateSerial?: boolean;
}

export const DEFAULT_OPTIONS: Required<RollupPluginSbomOptions> = {
    specVersion: Spec.Version.v1dot5,
    rootComponentType: Enums.ComponentType.Application,
    outDir: "cyclonedx",
    saveTimestamp: true,
    autodetect: true,
    generateSerial: false,
};
