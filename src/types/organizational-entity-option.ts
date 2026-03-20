/**
 * Configuration schema for an organizational entity which will be converted to a CycloneDX model internally
 * @see https://cyclonedx-javascript-library.readthedocs.io/en/latest/typedoc/node/classes/Models.OrganizationalEntity.html
 */
export interface OrganizationalEntityOption {
    /**
     * The name of the organization
     * @example
     * "Acme Inc."
     */
    name?: string;
    /**
     * The URL of the organization. Multiple URLs are allowed.
     * @example
     * "https://example.com"
     */
    url: string[];
    /**
     * A contact at the organization. Multiple contacts are allowed.
     */
    contact: {
        /**
         * The name of a contact
         * @example
         * "Contact name"
         */
        name?: string;
        /**
         * The email address of the contact.
         * @example
         * "firstname.lastname@example.com"
         */
        email?: string;
        /**
         * The phone number of the contact.
         * @example
         * "800-555-1212"
         */
        phone?: string;
    }[];
}
