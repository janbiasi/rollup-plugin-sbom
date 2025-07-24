import { Enums, Spec, Models } from "@cyclonedx/cyclonedx-library";
import type { OrganizationalEntityOption } from "./types/OrganizationalEntityOption";

/**
 * A method which can transform a BOM model.
 * Changes are applied directly to the BOM.
 */
type BomTransformHookFn = (bom: Models.Bom) => void;

/**
 * SBOM plugin configuration options
 * @see https://github.com/janbiasi/rollup-plugin-sbom?tab=readme-ov-file#configuration-options
 */
export interface RollupPluginSbomOptions {
    /**
     * Specification version to use, defaults to {@link Spec.Spec1dot6}
     * @since 1.0.0
     */
    specVersion?: `${Spec.Version}`;
    /**
     * Defaults to Application
     * @since 1.0.0
     */
    rootComponentType?: `${Enums.ComponentType}`;
    /**
     * Output directory to use, defaults to `"cyclonedx"`.
     * Note: you don't need to prefix the build output path as the plugin
     * uses the internal file emitter to write files.
     * @since 1.0.0
     */
    outDir?: string;
    /**
     * The base filename for the SBOM files, defaults to 'bom'
     * @since 1.0.0
     */
    outFilename?: string;
    /**
     * The formats to output, defaults to ['json', 'xml']
     * @since 1.0.0
     */
    outFormats?: ("json" | "xml")[];
    /**
     * If you want to save the timestamp of the generation, defaults to `true`
     * @since 1.0.0
     */
    saveTimestamp?: boolean;
    /**
     * If you want to get the root package registered automatically, defaults to `true`.
     * You may set this to `false` if your project does not a have a `package.json`
     * @since 1.0.0
     */
    autodetect?: boolean;
    /**
     * Whether to generate a serial number for the BOM. Defaults to `false`.
     * @since 1.0.0
     */
    generateSerial?: boolean;
    /**
     * Whether to generate a SBOM in the `.well-known` directory. Defaults to `true`.
     * @since 1.0.0
     */
    includeWellKnown?: boolean;
    /**
     * The organization that supplied the component that the BOM describes.
     * The supplier may often be the manufacturer, but may also be a distributor or repackager.
     * @since 1.1.0
     */
    supplier?: OrganizationalEntityOption | undefined;
    /**
     * Provides the ability to document properties in a name-value store.
     * This provides flexibility to include data not officially supported in the standard without
     * having to use additional namespaces or create extensions. Unlike key-value stores, properties
     * support duplicate names, each potentially having different values.
     *
     * Property names of interest to the general public are encouraged to be registered in the
     * CycloneDX Property Taxonomy. Formal registration is OPTIONAL.
     *
     * @since 1.1.0
     * @see https://github.com/CycloneDX/cyclonedx-property-taxonomy
     */
    properties?: { name: string; value: string }[] | undefined;
    /**
     * Optional method to enable setting additional properties in the BOM before collecting it.
     * This can be useful if or you need to add information which the plugin doesn't support at the time beeing.
     *
     * @since 2.1.0
     * @param {Models.Bom} bom The initial SBOM for the project
     * @returns The modified SBOM
     */
    beforeCollect?: BomTransformHookFn | undefined;
    /**
     * Optional method to enable modifying the BOM after collecting it.
     * This can be useful if there's a temporary issue in generation.
     * If you need to add additional properties it is recommended to use {@link beforeCollect}.
     *
     * @since 2.1.0
     * @param {Models.Bom} bom The generated SBOM for the project
     * @returns The modified SBOM
     */
    afterCollect?: BomTransformHookFn | undefined;
}

export const DEFAULT_OPTIONS: Required<RollupPluginSbomOptions> = {
    specVersion: Spec.Version.v1dot6,
    rootComponentType: Enums.ComponentType.Application,
    outDir: "cyclonedx",
    outFilename: "bom",
    outFormats: ["json", "xml"],
    saveTimestamp: true,
    autodetect: true,
    generateSerial: false,
    includeWellKnown: true,
    supplier: undefined,
    properties: undefined,
    beforeCollect: undefined,
    afterCollect: undefined,
};
