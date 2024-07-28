export const DEFAULT_SOURCE_PRESET_ID = "custom";
export interface SourcePreset {
    /**
     * Whether to fetch parts of linked entities (e.g. the members of a duo)
     */
    fetch_parts_of_linked_entities?: boolean;

    /**
     * Unique identifier for the source preset.
     */
    id: string;

    /**
     * ID of the MapComplete theme to link to from the button in the feature details popup
     */
    mapcomplete_theme?: string;

    /**
     * OSM tags to use for filtering the results; for optimal performance if you initialize the DB from OSM PBF dump sort the tags from the most frequent to the least frequent
     */
    osm_filter_tags?: string[];

    /**
     * OSM key whose value contains the human readable name of the linked entity
     * @example "name:etymology"
     */
    osm_text_key?: string;

    /**
     * OSM key whose value contains the description of the linked entity
     * @example "name:etymology:description"
     */
    osm_description_key?: string;

    /**
     * OSM keys which connect the subject (map element) to the linked entity (popup element)
     * @example ["name:etymology:wikidata","subject:wikidata"]
     */
    osm_wikidata_keys?: string[];

    /**
     * P-IDs of the Wikidata properties which connect the subject (map element) to the linked entity (popup element)
     */
    osm_wikidata_properties?: string[];

    /**
     * Whitelist of OSM relation roles to consider when propagating linked entities from relations to their members
     */
    relation_role_whitelist?: string[];

    /**
     * Whitelist of Q-IDs of Wikidata classes to consider when filtering linked entities
     */
    wikidata_filter_classes?: string[];

    /**
     * P-ID of the Wikidata property which connects the linked entity (popup element) to a relation whose P625 qualifier identifies the coordinates of the subject (map element)
     */
    wikidata_indirect_property?: string;

    /**
     * P-ID of the Wikidata property which connects the linked entity (popup element) to a Wikimedia Commons image of the subject (map element)
     */
    wikidata_image_property?: string;
}