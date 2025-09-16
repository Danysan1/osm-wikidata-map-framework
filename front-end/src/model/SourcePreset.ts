export const DEFAULT_SOURCE_PRESET_ID = "custom";
export interface SourcePreset {
    /**
     * Background color for controls and popups
     */
    background_color?: string;

    /**
     * Whether to fetch parts of linked entities (e.g. the members of a duo)
     */
    fetch_parts_of_linked_entities?: boolean;

    /**
     * Unique identifier for the source preset.
     */
    id: string;

    /**
     * When using Overpass-based back-ends, big elements like country/region borders and the biggest lakes can create major slowdowns.
     * To display them pmtiles-based back-ends are recommended.
     * This setting allows to filter out big elements in the Overpass queries used by Overpass-based back-ends.
     */
    ignore_big_elements?: boolean;

    /**
     * ID of the MapComplete theme to link to from the button in the feature details popup
     * 
     * @example "etymology" => https://mapcomplete.org/etymology.html
     */
    mapcomplete_theme?: string;

    /**
     * OSM tags to use for filtering the results.
     * For optimal performance if you initialize the DB from OSM PBF dump sort the tags from the most frequent to the least frequent.
     * 
     * @example ["artist:wikidata","artist_name=*","tourism","historic=*","amenity=fountain"]
     */
    osm_filter_tags?: string[];

    /**
     * OSM key whose value contains the human readable name of the linked entity
     * 
     * @example "name:etymology"
     */
    osm_text_key?: string;

    /**
     * OSM key whose value contains the description of the linked entity
     * 
     * @example "name:etymology:description"
     */
    osm_description_key?: string;

    /**
     * OSM keys which connect the subject (map element) to the linked entity (popup element)
     * 
     * @example ["name:etymology:wikidata","subject:wikidata"]
     */
    osm_wikidata_keys?: string[];

    /**
     * P-IDs of the Wikidata properties which connect the subject (map element) to the linked entity (popup element)
     * 
     * @example ["P138","P825","P547"]
     */
    osm_wikidata_properties?: string[];

    /**
     * OSM relation type to consider when propagating linked entities from relations to their members
     * 
     * @example "site" => If a relation with type=site has a linked entity it will be propagated to all members
     */
    relation_propagation_type?: string;

    /**
     * OSM relation member role to consider when propagating linked entities from relations to their members
     * 
     * @example "street" => If a relation has a linked entity it will be propagated to all members with the role "street", for example members of https://overpass-turbo.eu/s/1XdC
     */
    relation_propagation_role?: string;

    /**
     * OSM relation role to consider when using an OSM relation as linked entity
     * 
     * @example "tomb" => If an element is member with type "tomb" of a relation, the relation and its possible wikidata=* entity are considered a linked entity
     */
    relation_member_role?: string;

    /**
     * Whitelist of Q-IDs of Wikidata classes to consider when filtering features from Wikidata
     * 
     * @example ["Q473972","Q179049","Q46169"]
     */
    feature_filter_classes?: string[];

    /**
     * Whitelist of Q-IDs of Wikidata classes to consider when filtering linked entities
     * 
     * @example ["Q15056995", "Q15056993", "Q111722634", "Q110055303"]
     */
    linked_entity_filter_classes?: string[];

    /**
     * Whether to show linked entity count (instead of feature count) in clusters
     */
    use_linked_entity_count?: boolean;

    /**
     * Whether to use the min_zoom_level setting
     */
    use_min_zoom_level?: boolean;

    /**
     * P-ID of the Wikidata property which connects the linked entity (popup element) to a relation whose P625 qualifier identifies the coordinates of the subject (map element)
     * 
     * @example "P119"
     */
    wikidata_indirect_property?: string;

    /**
     * P-ID of the Wikidata property which connects the linked entity (popup element) to a Wikimedia Commons image of the subject (map element)
     * 
     * @example "P1442"
     */
    wikidata_image_property?: string;
}